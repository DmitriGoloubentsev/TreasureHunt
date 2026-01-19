---
admin_password: treasure2024
default_timeout_minutes: 15
hint_penalty_minutes: 5
organizers:
  - name: Alex
    phone: +1234567890
    telegram: alex_org
    whatsapp: +1234567890
  - name: Sam
    phone: +0987654321
    telegram: sam_org
    whatsapp: +0987654321
---

# Game Configuration

This file contains configuration for the treasure hunt generator.

## Settings

- `admin_password`: Password for the admin.html organizer panel
- `default_timeout_minutes`: Default time limit per task (can be overridden per task)
- `hint_penalty_minutes`: Time penalty added when organizers give the answer
- `organizers`: List of organizers with contact info (name, phone, telegram, whatsapp)
