export interface SendCodeResult {
  success: boolean;
  code: string;
  method?: 'smtp' | 'ethereal' | 'local' | 'resend';
  message: string;
  previewUrl?: string;
  error?: string;
}

export async function sendParentVerificationCode(
  email: string,
  childName: string = 'Astrid',
  purpose: 'onboarding' | 'recovery' | 'pin_change' | 'startup_check' = 'onboarding'
): Promise<SendCodeResult> {
  // Generate reliable 6-digit PIN
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const res = await fetch('/api/send-parent-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        code,
        childName,
        purpose,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        code,
        method: data.method,
        message: data.message || `Verifieringskod skickad till ${email}`,
        previewUrl: data.previewUrl,
      };
    } else {
      const errData = await res.json().catch(() => ({}));
      console.warn('API send-parent-code response error:', errData);
      return {
        success: true, // Still return code so parent is never blocked
        code,
        method: 'local',
        message: `Kod genererad (${code})`,
        error: errData.error,
      };
    }
  } catch (err: any) {
    console.error('Failed to reach backend email API:', err);
    return {
      success: true,
      code,
      method: 'local',
      message: `Kod skapad lokalt (${code})`,
      error: 'Kunde inte ansluta till e-postservern',
    };
  }
}

export interface InviteCoParentParams {
  secondParentEmail: string;
  secondParentName: string;
  childName: string;
  invitingParentEmail?: string;
  pin: string;
  syncUrl: string;
}

export async function sendCoParentInvitation(params: InviteCoParentParams): Promise<SendCodeResult> {
  try {
    const res = await fetch('/api/invite-co-parent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        code: params.pin,
        method: data.method,
        message: data.message || `Inbjudan skickad till ${params.secondParentEmail}`,
        previewUrl: data.previewUrl,
      };
    } else {
      const errData = await res.json().catch(() => ({}));
      return {
        success: true,
        code: params.pin,
        method: 'local',
        message: `Inbjudningslänk skapad`,
        previewUrl: undefined,
        error: errData.error,
      };
    }
  } catch (err: any) {
    console.error('Failed to reach backend invite co-parent API:', err);
    return {
      success: true,
      code: params.pin,
      method: 'local',
      message: `Inbjudningslänk redo lokalt`,
      error: 'Kunde inte ansluta till e-postservern',
    };
  }
}

