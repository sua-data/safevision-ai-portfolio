def calculate_risk(
    no_helmet,
    no_safety_vest,
    in_danger_zone
):
    score = 0

    if no_helmet:
        score += 40

    if no_safety_vest:
        score += 30

    if in_danger_zone:
        score += 30

    if score >= 80:
        status = "CRITICAL"
    elif score >= 60:
        status = "DANGER"
    elif score >= 30:
        status = "WARNING"
    else:
        status = "SAFE"

    return score, status