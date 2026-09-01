import uuid
from auth.db import SessionLocal, engine, Base
from models.user import User
from auth.security import hash_password
Base.metadata.create_all(bind=engine)
db = SessionLocal()
email = "ruhi@gmail.com"
existing = db.query(User).filter(User.email == email).first()

if existing:
    existing.name = "Ruhi"
    existing.hashed_password = hash_password("Ruhi@12345")
    existing.role = "patient"
    existing.is_active = True
    db.commit()
    print(f"Updated existing account -> {email}")
else:
    patient = User(
        id=str(uuid.uuid4()),
        name="Ruhi",
        email=email,
        hashed_password=hash_password("Ruhi@12345"),
        role="patient",
        verification_status="approved",
        preferred_language="en",
        is_active=True,
    )
    db.add(patient)
    db.commit()
    print(f"Created new patient account -> {email}")
db.close()