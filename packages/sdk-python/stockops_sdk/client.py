import urllib.parse
from typing import Any, Dict, List, Optional

import requests


class StockOpsAPIError(Exception):
    """Exception raised when the StockOps API returns an error response."""
    pass


class StockOpsClient:
    """Python client for the StockOps public extension API."""
    
    def __init__(self, base_url: str, api_token: str):
        self.base_url = base_url.rstrip("/")
        self.api_token = api_token
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        })

    def _request(self, method: str, path: str, **kwargs) -> Any:
        url = f"{self.base_url}{path}"
        response = self.session.request(method, url, **kwargs)
        
        if not response.ok:
            raise StockOpsAPIError(f"StockOps API {response.status_code}: {response.text}")
            
        return response.json()

    def me(self) -> Dict[str, Any]:
        return self._request("GET", "/auth/me")

    def list_products(self) -> List[Dict[str, Any]]:
        return self._request("GET", "/products")

    def create_product(self, sku: str, name: str, category: str, minimum_stock: int, barcode: Optional[str] = None) -> Dict[str, Any]:
        body = {
            "sku": sku,
            "name": name,
            "category": category,
            "minimumStock": minimum_stock
        }
        if barcode is not None:
            body["barcode"] = barcode
            
        return self._request("POST", "/products", json=body)

    def list_extension_events(self) -> List[str]:
        return self._request("GET", "/extensions/events")

    def list_webhook_subscriptions(self) -> List[Dict[str, Any]]:
        return self._request("GET", "/extensions/webhook-subscriptions")

    def create_webhook_subscription(self, url: str, events: List[str], secret: Optional[str] = None) -> Dict[str, Any]:
        body = {
            "url": url,
            "events": events
        }
        if secret is not None:
            body["secret"] = secret
            
        return self._request("POST", "/extensions/webhook-subscriptions", json=body)

    def set_custom_field(self, entity_type: str, entity_id: str, key: str, value: Any) -> Dict[str, Any]:
        encoded_type = urllib.parse.quote(entity_type, safe='')
        encoded_id = urllib.parse.quote(entity_id, safe='')
        path = f"/extensions/custom-fields/{encoded_type}/{encoded_id}"
        
        body = {
            "key": key,
            "value": value
        }
        return self._request("PUT", path, json=body)
