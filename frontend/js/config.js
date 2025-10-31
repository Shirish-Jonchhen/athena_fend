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

// export const RTC_CONFIG = {
//   iceServers: [
//     // STUN (fallbacks)
//     { urls: "stun:stun.l.google.com:19302" },
//     { urls: "stun:stun1.l.google.com:19302" },
//     { urls: "stun:stun2.l.google.com:19302" },
//     { urls: "stun:stun3.l.google.com:19302" },
//     { urls: "stun:stun4.l.google.com:19302" },
//     { urls: "stun:stun.ekiga.net:3478" },
//     { urls: "stun:stun.fwdnet.net:3478" },
//     { urls: "stun:stunserver.org:3478" },
//     { urls: "stun:stun.voiparound.com:3478" },
//     { urls: "stun:stun.xten.com:3478" },

//     // TURN (relay) — example OpenRelay public TURN + STUN (free tier) :contentReference[oaicite:1]{index=1}
//     {
//       urls: [
//         "turn:openrelay.metered.ca:80?transport=udp",
//         "turn:openrelay.metered.ca:443?transport=tcp",
//         "turns:openrelay.metered.ca:443"
//       ],
//       username: "openrelayproject",
//       credential: "openrelayproject"
//     }
//   ]
// };


export function getAthenaBase() {
  const el = document.getElementById("apiAthena");
  return (el?.value || "http://127.0.0.1:8000").trim();
}

export function getEchoBase() {
  const el = document.getElementById("apiEcho");
  return (el?.value || "http://127.0.0.1:8080").trim();
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
    "id": "19a8f41c-0464-4978-a36c-d57ecf265df8",
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