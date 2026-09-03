import os
import uuid
import logging

logger = logging.getLogger(__name__)

class MockRazorpayClient:
    def __init__(self):
        self.mock_mode = True
        logger.info("Initializing Mock Razorpay Client")

    def create_payment_link(self, amount: float, reference_id: str, description: str, **kwargs):
        """
        Simulates creating a Razorpay Payment Link.
        """
        link_id = f"plink_{uuid.uuid4().hex[:14]}"
        logger.info(f"Mocked payment link created: {link_id} for order {reference_id}, amount: {amount}")
        
        return {
            "id": link_id,
            "reference_id": reference_id,
            "amount": amount * 100, # Razorpay expects paise
            "status": "created",
            "short_url": f"https://rzp.io/i/{link_id}",
            "description": description
        }

# Global instance
client = MockRazorpayClient()

def get_client():
    return client
