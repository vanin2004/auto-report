from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func

from app.database.db import Base


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=True, default="")
    filename = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
