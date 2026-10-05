from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..auth import current_user, ensure_settings
from ..db import get_session
from ..models import BusinessSettings, Client, User
from ..schemas import SettingsIn, SettingsOut
from ..services import next_invoice_number

router = APIRouter(prefix="/settings", tags=["settings"])


def _out(s: BusinessSettings) -> SettingsOut:
    data = {k: getattr(s, k) for k in SettingsOut.model_fields if k != "next_number_preview"}
    return SettingsOut(**data, next_number_preview=next_invoice_number(s))


@router.get("", response_model=SettingsOut)
def get_settings(user: User = Depends(current_user), session: Session = Depends(get_session)):
    return _out(ensure_settings(session, user))


@router.put("", response_model=SettingsOut)
def update_settings(body: SettingsIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
    s = ensure_settings(session, user)
    patch = body.model_dump(exclude_unset=True)
    if "default_client_id" in patch and patch["default_client_id"] is not None:
        c = session.get(Client, patch["default_client_id"])
        if not c or c.user_id != user.id:
            raise HTTPException(400, "Unknown client")
    if "number_format" in patch and "{" not in patch["number_format"]:
        raise HTTPException(400, "Number format needs a {0000} placeholder")
    for k, v in patch.items():
        setattr(s, k, v)
    session.add(s)
    session.commit()
    session.refresh(s)
    return _out(s)
