"""Fetch and extract text from a user-supplied job-posting URL.

Server-side fetching of arbitrary user URLs is an SSRF risk, so this
module validates aggressively: http(s) only, resolved IPs must be public
(no loopback/private/link-local/reserved/cloud-metadata ranges), every
redirect hop is re-validated, and responses are capped by time and size
and restricted to HTML/text content.

Residual risk: DNS rebinding between validation and the socket connect is
not fully prevented (would require pinning the resolved IP on connect).
The common SSRF targets — localhost, 169.254.169.254, internal hostnames
— are blocked.
"""

import ipaddress
import socket
from urllib.parse import urljoin, urlparse

import requests
from rest_framework.exceptions import ValidationError

MAX_BYTES = 2 * 1024 * 1024
TIMEOUT = 8  # seconds per hop
MAX_REDIRECTS = 4
_USER_AGENT = "BriefcaseBot/1.0 (+https://briefcasecareer.com)"
_GENERIC_ERROR = "That URL could not be fetched. Paste the job description instead."


def _host_is_public(hostname: str) -> bool:
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            return False
    return True


def _validate_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValidationError("Enter a valid http(s) job posting URL.")
    if not parsed.hostname:
        raise ValidationError("Enter a valid job posting URL.")
    if not _host_is_public(parsed.hostname):
        raise ValidationError(_GENERIC_ERROR)


def _html_to_text(html: bytes) -> str:
    from lxml import html as lxml_html

    try:
        doc = lxml_html.fromstring(html)
    except Exception:
        raise ValidationError("Could not read that page. Paste the job description instead.")

    for node in doc.xpath("//script | //style | //noscript | //nav | //footer | //header | //svg"):
        parent = node.getparent()
        if parent is not None:
            parent.remove(node)

    text = doc.text_content()
    lines = [line.strip() for line in text.splitlines()]
    return "\n".join(line for line in lines if line).strip()


def fetch_url_text(url: str) -> str:
    """Fetches a job-posting URL and returns its readable text.

    Follows redirects manually so each hop is SSRF-validated.
    """
    current = url
    for _ in range(MAX_REDIRECTS + 1):
        _validate_url(current)
        try:
            response = requests.get(
                current,
                timeout=TIMEOUT,
                allow_redirects=False,
                stream=True,
                headers={"User-Agent": _USER_AGENT, "Accept": "text/html,application/xhtml+xml"},
            )
        except requests.RequestException:
            raise ValidationError(_GENERIC_ERROR)

        if response.is_redirect or response.is_permanent_redirect:
            location = response.headers.get("Location")
            response.close()
            if not location:
                raise ValidationError(_GENERIC_ERROR)
            current = urljoin(current, location)
            continue

        content_type = response.headers.get("Content-Type", "")
        if "html" not in content_type and "text" not in content_type:
            response.close()
            raise ValidationError("That link doesn't look like a job posting page.")

        chunks = []
        total = 0
        for chunk in response.iter_content(chunk_size=8192):
            chunks.append(chunk)
            total += len(chunk)
            if total > MAX_BYTES:
                break
        response.close()
        return _html_to_text(b"".join(chunks))

    raise ValidationError("Too many redirects while fetching that URL.")
