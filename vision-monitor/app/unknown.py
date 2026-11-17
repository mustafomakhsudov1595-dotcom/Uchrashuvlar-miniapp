"""Tanilmagan yuzlar navbati: administrator "bu kim?" deb tasdiqlaydi -> tizim o'rganadi."""
import json
import time

import cv2
import numpy as np

from . import db
from .config import FACES


def save(user_id, camera_id, label, face):
    """Yangi tanilmagan yuz. Bir xil odam qayta-qayta qo'shilmasligi uchun avvalgilar bilan solishtiriladi."""
    emb = np.asarray(face.emb, dtype=np.float32)
    now = time.time()
    for r in db.q("SELECT id,embedding,label FROM unknown_faces WHERE user_id=? AND status='pending' AND last_ts>?", (user_id, now - 7 * 86400)):
        if float(np.dot(emb, np.asarray(json.loads(r["embedding"]), dtype=np.float32))) > 0.6:
            labels = r["label"].split("|") if r["label"] else []
            if label not in labels:
                labels.append(label)
            db.run("UPDATE unknown_faces SET last_ts=?, seen=seen+1, label=? WHERE id=?", (now, "|".join(labels[-50:]), r["id"]))
            return r["id"]
    uid = db.run(
        "INSERT INTO unknown_faces(user_id,camera_id,label,gender,age,embedding,photo,first_ts,last_ts) VALUES(?,?,?,?,?,?,'',?,?)",
        (user_id, camera_id, label, face.gender, face.age, json.dumps([round(float(x), 5) for x in emb]), now, now),
    )
    name = f"{user_id}_{uid}.jpg"
    if face.crop is not None:
        cv2.imwrite(str(FACES / name), face.crop, [cv2.IMWRITE_JPEG_QUALITY, 88])
    db.run("UPDATE unknown_faces SET photo=? WHERE id=?", (name, uid))
    return uid
