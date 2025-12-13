// export const RTC_CONFIG = {
//   iceServers: [
//     { urls: "stun:stun.l.google.com:19302" },
//     { urls: ["turn:relay1.expressturn.com:3480"], username: "000000002073837937", credential: "TUgDM0JY+obVrqoQO1HZ7ehNn40=" },
//     { urls: "turn:relay1.expressturn.com:3478",  username: "000000002073837937", credential: "TUgDM0JY+obVrqoQO1HZ7ehNn40=" },
//     { urls: "turns:relay1.expressturn.com:5349", username: "000000002073837937", credential: "TUgDM0JY+obVrqoQO1HZ7ehNn40=" },
//   ],
// };

export const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:turn.voyageapp.pro:3478' },
    {
      urls:'turn:turn.voyageapp.pro:443',
      username: 'testuser',
      credential: 'testpassword'

    },
    {
      urls: 'turn:turn.voyageapp.pro:3478?transport=udp',
      // urls:'turn:13.234.186.243:3478?transport=udp',
      username: 'testuser',
      credential: 'testpassword'
    },
    {
      urls: 'turn:turn.voyageapp.pro:3478?transport=tcp',
      // urls:'turn:13.234.186.243:3478?transport=tcp',
      username: 'testuser',
      credential: 'testpassword'
    },
    ],
};

export function getAthenaBase() {
  const el = document.getElementById("apiAthena");
  return (el?.value || "http://127.0.0.1:8000").trim();
}

export function getEchoBase() {
  const el = document.getElementById("apiEcho");
  return (el?.value || "http://127.0.0.1:8080").trim();
}

function getDynamicAthenaBase(baseOverride) {
  if (typeof baseOverride === "string" && baseOverride.trim()) {
    return baseOverride.trim().replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const fromWindow = window.BEND_URL;
    if (typeof fromWindow === "string" && fromWindow.trim()) {
      return fromWindow.trim().replace(/\/$/, "");
    }
  }

  const fallback = getAthenaBase();
  return fallback?.trim().replace(/\/$/, "");
}

export function getAthenaWebSocketUrl(baseOverride) {
  const base = getDynamicAthenaBase(baseOverride);
  
  if (base) {
    // If already ws/wss, use directly
    if (/^wss?:\/\//i.test(base)) {
      return base.replace(/\/+$/, '') + '/api/ws-offer';
    }
  
    // Convert http(s) to ws(s)
    if (/^https?:\/\//i.test(base)) {
      const wsScheme = base.startsWith('https:') ? 'wss:' : 'ws:';
      const hostPort = base.replace(/^https?:\/\//i, '');
      return `${wsScheme}//${hostPort.replace(/\/+$/, '')}/api/ws-offer`;
    }
  }
  
  // Fallback: use current protocol
  const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${location.host}/api/ws-offer`;
}


export function getClientId() {
  const KEY = "voyage_client_id";
  try {
    const existing = sessionStorage.getItem(KEY);
    if (existing) return existing;

    const id = `c-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
    sessionStorage.setItem(KEY, id);
    return id;
  } catch {
    // Fallback (private browsing etc.)
    return `c-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
  }
}


export const DEFAULT_CHARACTER = "lucy"; // or "mark"
export const VISA_PROFILE = {
    "id": "97e3511f-554c-4718-b330-0a970d362cab",
    "data": {
        "visa_type": "F-1 Visa",
        "personal_info": {
            "full_name": "Aarav Shrestha",
            "dob": "1999-07-22",
            "gender": "Male",
            "nationality": "Nepalese",
        },
        "educational_info": {
            "highest_degree": "Bachelor’s in Civil Enginesering",
            "school_name": "Kathmandu University",
            "graduation_year": "2023",
            "intended_university": "University of Texas at Arlington",
            "intended_program": "Master’s in Data Science",
            "admission_status": "Not selected yet",
            "major_program": "Civil Engineering",
        },
        "funding": {
            "currency": "USD",
            "personal_fund": "8000",
            "scholarship_fund": "0",
            "loan_amount": "0",
            "total_fund": "8000",
            "family_sponsors": [
                {
                    "relationship": "Father",
                    "job": "Civil Engineer",
                    "annual_income": "25000",
                    "amount": "7000",
                }
            ],
        },
    },
};




