from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, Text
from sqlalchemy.sql import func
from ..database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        String(36), primary_key=True, default=lambda: __import__("uuid").uuid4()
    )
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), default="STAFF")
    position = Column(String(50), default="STAFF")
    restaurant_id = Column(String(36), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime, nullable=True)


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(
        String(36), primary_key=True, default=lambda: __import__("uuid").uuid4()
    )
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False, index=True)
    location = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class DeliveryData(Base):
    __tablename__ = "delivery_data"

    id = Column(
        String(36), primary_key=True, default=lambda: __import__("uuid").uuid4()
    )
    order_id = Column(String(50), unique=True, nullable=False, index=True)
    restaurant_id = Column(String(36), nullable=False, index=True)

    location = Column(String(255), nullable=False)
    order_time = Column(DateTime, nullable=False, index=True)
    delivery_time = Column(DateTime, nullable=False)
    delivery_duration = Column(Integer)
    order_month = Column(String(7), index=True)
    order_hour = Column(Integer)

    pizza_size = Column(String(50))
    pizza_type = Column(String(50))
    toppings_count = Column(Integer)
    pizza_complexity = Column(Integer)
    topping_density = Column(Float)

    distance_km = Column(Float)
    traffic_level = Column(String(50))
    traffic_impact = Column(Integer)
    is_peak_hour = Column(Boolean)
    is_weekend = Column(Boolean)

    payment_method = Column(String(50))
    payment_category = Column(String(50))
    estimated_duration = Column(Float)
    delivery_efficiency = Column(Float)
    delay_min = Column(Float)
    is_delayed = Column(Boolean, index=True)

    restaurant_avg_time = Column(Float)

    uploaded_by = Column(String(50))
    uploaded_at = Column(DateTime, server_default=func.now())
    validated_at = Column(DateTime, nullable=True)
    validated_by = Column(String(50), nullable=True)
    quality_score = Column(Float)
    version = Column(Integer, default=1)
