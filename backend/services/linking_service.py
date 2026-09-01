"""
MediGuard AI — Linking Service
================================
Handles patient-doctor linking requests, status changes, and queries.
"""

from __future__ import annotations
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from models.user import User
from models.doctor_profile import DoctorProfile
from models.doctor_patient_link import DoctorPatientLink
from models.notification import Notification

logger = logging.getLogger(__name__)


class LinkingService:

    @staticmethod
    def is_linked(db: Session, doctor_id: str, patient_id: str) -> bool:
        """True if this doctor has an accepted link to this patient."""
        return (
            db.query(DoctorPatientLink)
            .filter(
                DoctorPatientLink.doctor_id == doctor_id,
                DoctorPatientLink.patient_id == patient_id,
                DoctorPatientLink.status == "accepted",
            )
            .first()
            is not None
        )

    @staticmethod
    def create_link_request(db: Session, patient_id: str, doctor_id: str, notes: str = "") -> DoctorPatientLink:
        """Patient requests to connect with a doctor."""
        doctor = db.query(User).filter(User.id == doctor_id, User.role == "doctor").first()
        if not doctor:
            raise ValueError("Target doctor not found.")
        if doctor.verification_status != "approved":
            raise ValueError("Doctor is not verified yet.")

        existing = (
            db.query(DoctorPatientLink)
            .filter(
                DoctorPatientLink.patient_id == patient_id,
                DoctorPatientLink.doctor_id == doctor_id,
            )
            .first()
        )
        if existing:
            if existing.status == "pending":
                raise ValueError("A connection request is already pending with this doctor.")
            elif existing.status == "accepted":
                raise ValueError("You are already connected with this doctor.")
            else:
                existing.status = "pending"
                existing.notes = notes
                db.commit()
                db.refresh(existing)
                return existing

        link = DoctorPatientLink(
            patient_id=patient_id,
            doctor_id=doctor_id,
            status="pending",
            notes=notes,
        )
        db.add(link)
        db.commit()
        db.refresh(link)

        patient = db.query(User).filter(User.id == patient_id).first()
        p_name = patient.name if patient else "A patient"
        notification = Notification(
            user_id=doctor_id,
            title="New Connection Request",
            message=f"{p_name} requested to link with your doctor profile.",
            type="link_request",
        )
        db.add(notification)
        db.commit()

        logger.info("Patient %s created link request to Doctor %s", patient_id, doctor_id)
        return link

    @staticmethod
    def respond_link_request(db: Session, link_id: str, doctor_id: str, new_status: str) -> DoctorPatientLink:
        """Doctor accepts or rejects a link request."""
        if new_status not in ["accepted", "rejected"]:
            raise ValueError("Status must be 'accepted' or 'rejected'.")

        link = db.query(DoctorPatientLink).filter(DoctorPatientLink.id == link_id, DoctorPatientLink.doctor_id == doctor_id).first()
        if not link:
            raise ValueError("Connection request not found.")

        link.status = new_status
        db.commit()
        db.refresh(link)

        doc = db.query(User).filter(User.id == doctor_id).first()
        doc_name = doc.name if doc else "Doctor"
        notification = Notification(
            user_id=link.patient_id,
            title="Connection Request Update",
            message=f"Dr. {doc_name} has {new_status} your connection request.",
            type="link_request",
        )
        db.add(notification)
        db.commit()

        return link

    @staticmethod
    def ensure_linked(db: Session, doctor_id: str, patient_id: str, source: str = "") -> DoctorPatientLink:
        """
        Idempotently ensure an *accepted* link exists between this doctor
        and patient, regardless of whether either of them ever went through
        the explicit "request to connect" flow above.

        Needed because appointments are booked directly (patient picks any
        approved doctor + open slot — see AppointmentService.create_appointment)
        without requiring a prior DoctorPatientLink. Without this, a doctor
        could confirm and complete an appointment and still see "0 linked
        patients" / "0 predictions" on their dashboard, since every doctor
        dashboard figure (My Patients, analytics, patient detail/history
        access) is gated on an accepted DoctorPatientLink, not on
        appointment history.
        """
        link = (
            db.query(DoctorPatientLink)
            .filter(
                DoctorPatientLink.doctor_id == doctor_id,
                DoctorPatientLink.patient_id == patient_id,
            )
            .first()
        )
        if link:
            if link.status != "accepted":
                link.status = "accepted"
                db.commit()
                db.refresh(link)
            return link

        link = DoctorPatientLink(
            patient_id=patient_id,
            doctor_id=doctor_id,
            status="accepted",
            notes=f"Auto-linked via {source}" if source else "Auto-linked",
        )
        db.add(link)
        db.commit()
        db.refresh(link)
        logger.info("Auto-linked Doctor %s to Patient %s via %s", doctor_id, patient_id, source or "unspecified")
        return link

    @staticmethod
    def get_patient_doctors(db: Session, patient_id: str) -> List[Dict[str, Any]]:
        """List all verified doctors and patient's connection status with them."""
        doctors = (
            db.query(User, DoctorProfile)
            .join(DoctorProfile, User.id == DoctorProfile.user_id)
            .filter(User.role == "doctor", User.verification_status == "approved")
            .all()
        )

        user_links = {
            link.doctor_id: link
            for link in db.query(DoctorPatientLink).filter(DoctorPatientLink.patient_id == patient_id).all()
        }

        output = []
        for user, profile in doctors:
            link = user_links.get(user.id)
            output.append({
                "doctor_id": user.id,
                "name": user.name,
                "email": user.email,
                "hospital_name": profile.hospital_name,
                "specialization": profile.specialization,
                "experience_years": profile.experience_years,
                "bio": profile.bio,
                "link_id": link.id if link else None,
                "link_status": link.status if link else "none",
            })
        return output

    @staticmethod
    def get_doctor_link_requests(db: Session, doctor_id: str) -> List[Dict[str, Any]]:
        """List connection requests for a doctor."""
        links = (
            db.query(DoctorPatientLink, User)
            .join(User, DoctorPatientLink.patient_id == User.id)
            .filter(DoctorPatientLink.doctor_id == doctor_id)
            .all()
        )
        return [
            {
                "link_id": link.id,
                "patient_id": user.id,
                "patient_name": user.name,
                "patient_email": user.email,
                "status": link.status,
                "notes": link.notes,
                "created_at": link.created_at.isoformat(),
            }
            for link, user in links
        ]