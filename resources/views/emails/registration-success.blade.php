<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Registration Successful</title>
</head>
<body style="font-family: Arial, sans-serif; background: #f5f9ff; padding: 24px;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #d9e5f5;">
        <h2 style="color: #0038A8; margin-top: 0;">
            Registration Successful
        </h2>

        <p>Hello <strong>{{ $participant['name'] }}</strong>,</p>

        <p>
            Your registration in the <strong>CHED Events Registration System</strong> has been successfully completed.
        </p>

        <div style="background: #f8fbff; border: 1px solid #d9e5f5; border-radius: 10px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px;">
                <strong>Participant ID:</strong> {{ $participant['participant_id'] }}
            </p>

            @if (!empty($participant['organization']))
                <p style="margin: 0 0 8px;">
                    <strong>Organization:</strong> {{ $participant['organization'] }}
                </p>
            @endif

            @if (!empty($participant['event_name']))
                <p style="margin: 0;">
                    <strong>Event:</strong> {{ $participant['event_name'] }}
                </p>
            @endif
        </div>

        <p>
            Please log in to your account or download your virtual ID from the system and present it during attendance scanning.
        </p>

        <p style="margin-top: 24px;">
            Thank you,<br>
            <strong>CHED Events Registration System</strong>
        </p>
    </div>
</body>
</html>