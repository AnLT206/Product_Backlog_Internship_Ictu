# -*- coding: utf-8 -*-
import sys
from app.core.database import SessionLocal
from app.models.user import User

def fix_names():
    db = SessionLocal()
    try:
        user_updates = {
            "admin@ictu.edu.vn": "Admin",
            "hr@ictu.edu.vn": "HR",
            "mentor@ictu.edu.vn": "Mentor",
            "intern@ictu.edu.vn": "TTS",
            "ungvien@ictu.edu.vn": "Ứng viên",
        }
        for email, name in user_updates.items():
            u = db.query(User).filter(User.email == email).first()
            if u:
                u.full_name = name
                print(f"Updated user ({u.email}) -> {name}")
        db.commit()
        print("Commit successfully!")
        
        # Verify
        users = db.query(User).all()
        for u in users:
            print(u.id, u.code, u.full_name, u.email)
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_names()
