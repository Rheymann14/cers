<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <title>Registration Successful</title>
</head>

<body style="font-family: Arial, sans-serif; background: #f5f9ff; padding: 24px;">
    <div
        style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #d9e5f5;">
        <h2 style="color: #0038A8; margin-top: 0;">
            Registration Successful!
        </h2>

        <p>Hello <strong>{{ $participant['name'] }}</strong>,</p>

        <p>
            Your registration in the <strong>CHED Events Registration System</strong> has been successfully completed.
        </p>

        <div style="margin: 20px 0 24px;">
            <p style="margin: 0 0 10px; font-size: 13px; font-weight: bold; color: #0038A8;">
                Virtual ID
            </p>
            
             <p style="margin: 0; font-size: 12px; color: #64748b; font-style: italic;">
                (System Generated ID / QR Code Section)
            </p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="border-collapse: collapse; background: #f8fbff; border: 1px solid #d9e5f5; border-radius: 12px;">
                <tr>
                    <td style="padding: 16px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                            style="border-collapse: collapse;">
                            <tr>
                                <td width="65%" valign="top" style="padding-right: 12px;">
                                    <table role="presentation" cellpadding="0" cellspacing="0"
                                        style="border-collapse: collapse; margin-bottom: 18px;">
                                        <tr>
                                            <td style="padding-right: 10px;">
                                               <img src="https://events.chedro.com/ched_logo-128.png" alt="CHED" width="36" height="36"
                                                    style="display: block; width: 36px; height: 36px; border-radius: 50%; background: #ffffff;">
                                            </td>
                                            <td>
                                                <p
                                                    style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a;">
                                                    CERS
                                                </p>
                                                <p style="margin: 2px 0 0; font-size: 11px; color: #475569;">
                                                    Participant Identification
                                                </p>
                                            </td>
                                        </tr>
                                    </table>

                                    <table role="presentation" cellpadding="0" cellspacing="0"
                                        style="border-collapse: collapse; margin-bottom: 18px;">
                                        <tr>
                                            <td width="54" height="54"
                                                style="width: 54px; height: 54px; text-align: center; vertical-align: middle; background: #ffffff; border: 1px solid #d9e5f5; border-radius: 8px; font-size: 18px; font-weight: bold; color: #0038A8;">
                                                {{ $participant['initials'] }}
                                            </td>
                                            <td style="padding-left: 12px;">
                                                <p
                                                    style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a;">
                                                    {{ $participant['name'] }}
                                                </p>

                                                @if (!empty($participant['organization']))
                                                <p style="margin: 4px 0 0; font-size: 12px; color: #475569;">
                                                    {{ $participant['organization'] }}
                                                </p>
                                                @endif
                                            </td>
                                        </tr>
                                    </table>

                                    <p
                                        style="margin: 0 0 4px; font-size: 10px; color: #64748b; text-transform: uppercase;">
                                        Participant ID
                                    </p>

                                    <p
                                        style="display: inline-block; margin: 0; padding: 6px 10px; background: #ffffff; border-radius: 999px; font-size: 12px; font-weight: bold; color: #0f172a;">
                                        {{ $participant['participant_id'] }}
                                    </p>
                                </td>

                                <td width="35%" valign="middle" align="center"
                                    style="background: #ffffff; border: 1px solid #d9e5f5; border-radius: 10px; padding: 12px;">
                                    <p style="margin: 0 0 8px; font-size: 11px; font-weight: bold; color: #0f172a;">
                                        QR Code
                                    </p>

                                    <img src="{{ $participant['qr_image_url'] }}" alt="Virtual ID QR Code" width="120"
                                        height="120" style="display: block; margin: 0 auto;">

                                    <p style="margin: 8px 0 0; font-size: 10px; font-weight: bold; color: #0f172a;">
                                        {{ $participant['participant_id'] }}
                                    </p>

                                    <p style="margin: 3px 0 0; font-size: 9px; color: #64748b;">
                                        CERS scanner verification only.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>

        <div
            style="background: #f8fbff; border: 1px solid #d9e5f5; border-radius: 10px; padding: 16px; margin: 20px 0;">
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
            Please keep a copy of your virtual ID and present it during attendance scanning.
        </p>

        <p style="margin-top: 24px;">
            Thank you,<br>
            <strong>CHED Events Registration System</strong>
        </p>

        <hr style="border: none; border-top: 1px solid #d9e5f5; margin: 24px 0 12px;">

        <p style="margin: 0; font-size: 12px; color: #64748b; font-style: italic;">
            * This is a system-generated message. Please do not reply to this email.
        </p>
    </div>
</body>

</html>