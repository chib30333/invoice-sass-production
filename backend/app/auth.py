"""JWT bearer auth with email/password, guest sessions and password reset."""
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
import bcrypt
import jwt
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from .config import settings
from .db import get_session
from .models import BusinessSettings, PasswordReset, User
from .schemas import ForgotIn, LoginIn, RegisterIn, ResetIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def make_token(user_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    return jwt.encode({"sub": str(user_id), "exp": exp}, settings.secret_key, algorithm="HS256")


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: Session = Depends(get_session),
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in to continue")
    try:
        payload = jwt.decode(creds.credentials, settings.secret_key, algorithms=["HS256"])
        user = session.get(User, int(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        user = None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired, sign in again")
    return user


def ensure_settings(session: Session, user: User, business_name: str = "") -> BusinessSettings:
    s = session.exec(select(BusinessSettings).where(BusinessSettings.user_id == user.id)).first()
    if s is None:
        s = BusinessSettings(user_id=user.id, business_name=business_name or "Your Studio")
        session.add(s)
        session.commit()
        session.refresh(s)
    return s


def to_user_out(u: User) -> UserOut:
    return UserOut(id=u.id, email=u.email, name=u.name, is_guest=u.is_guest, onboarded=u.onboarded)


@router.post("/register", response_model=TokenOut, status_code=201)
def register(body: RegisterIn, session: Session = Depends(get_session)):
    if session.exec(select(User).where(User.email == body.email.lower())).first():
        raise HTTPException(409, "An account with that email already exists")
    user = User(email=body.email.lower(), name=body.name, password_hash=hash_password(body.password))
    session.add(user)
    session.commit()
    session.refresh(user)
    ensure_settings(session, user, body.business_name)
    return TokenOut(access_token=make_token(user.id))


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == body.email.lower())).first()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "That email and password don't match")
    return TokenOut(access_token=make_token(user.id))


@router.post("/guest", response_model=TokenOut, status_code=201)
def guest(session: Session = Depends(get_session)):
    """'Continue without an account': a throwaway user so the editor works immediately."""
    user = User(name="Guest", is_guest=True)
    session.add(user)
    session.commit()
    session.refresh(user)
    ensure_settings(session, user)
    return TokenOut(access_token=make_token(user.id))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return to_user_out(user)


@router.post("/onboarded", response_model=UserOut)
def mark_onboarded(user: User = Depends(current_user), session: Session = Depends(get_session)):
    user.onboarded = True
    session.add(user)
    session.commit()
    session.refresh(user)
    return to_user_out(user)


@router.post("/forgot", status_code=202)
def forgot(body: ForgotIn, session: Session = Depends(get_session)):
    """Always 202 so the endpoint can't be used to probe which emails exist.
    In production, email the token; here it is logged so you can test the flow."""
    user = session.exec(select(User).where(User.email == body.email.lower())).first()
    if user:
        token = secrets.token_urlsafe(32)
        session.add(PasswordReset(user_id=user.id, token=token,
                                  expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.reset_token_minutes)))
        session.commit()
        print(f"[invoice-studio] password reset link: /reset-password?token={token}")
    return {"ok": True}


@router.post("/reset", response_model=TokenOut)
def reset(body: ResetIn, session: Session = Depends(get_session)):
    pr = session.exec(select(PasswordReset).where(PasswordReset.token == body.token)).first()
    if not pr or pr.used or pr.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(400, "This reset link has expired. Request a new one.")
    user = session.get(User, pr.user_id)
    user.password_hash = hash_password(body.password)
    pr.used = True
    session.add_all([user, pr])
    session.commit()
    return TokenOut(access_token=make_token(user.id))
