from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Define the request body schema
class Booking(BaseModel):
    total_booking_amount: float

# Add CORS middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

@app.post("/calculate_gst")
async def calculate_gst(booking: Booking):
    total_booking_amount = booking.total_booking_amount
    cgst = total_booking_amount * 0.09
    sgst = total_booking_amount * 0.09
    total_gst = cgst + sgst
    total_amount = total_booking_amount + total_gst

    return {
        "base_amount": total_booking_amount,
        "cgst": cgst,
        "sgst": sgst,
        "total_gst": total_gst,
        "total_amount": total_amount
    }
