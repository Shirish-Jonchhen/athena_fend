export class DC {
    /** @param {RTCDataChannel} channel
        @param {{
          onOpen?: () => void,
          onClose?: () => void,
          onState?: (state: 'listening' | 'thinking' | 'speaking' | string) => void,
          onSTT?: (kind: 'interim'|'final', idx: number, text: string) => void,
          onLLM?: (text: string) => void,
          onLog?: (data: any) => void,
          onMedia?: (data: any, raw?: any) => void,
          onReportProgress?: (data: any, raw?: any) => void,
          onReportComplete?: (data: any, raw?: any) => void,
          onError?: (msg: string) => void,
        }} handlers */
    constructor(channel, handlers = {}) {
        this.ch = channel;
        this.h = handlers;

        this.ch.onopen = () => this.h.onOpen?.();
        this.ch.onclose = () => this.h.onClose?.();
        this.ch.onmessage = (ev) => this.#handle(ev);
    }

    send(type, extra = {}) {
        try {
            this.ch?.send(JSON.stringify({ type, ...extra }));
        } catch { }
    }

    #handle(ev) {
        const raw = typeof ev.data === "string" ? ev.data : "";
        if (!raw) return;

        let payload = null;
        try { payload = JSON.parse(raw); } catch { return; }
        if (!payload || typeof payload !== "object") return;

        const event = (payload.event || "").toString().toLowerCase();
        const success = payload.success !== false;
        const message = (payload.message || "").toString();
        const data = (payload.data && typeof payload.data === "object") ? payload.data : {};
        const errorCode = (payload.error_code || "").toString();
        const reason = (data.reason || "").toString();

        // Unified 3-state pipe: server already normalizes to "listening|thinking|speaking"
        if (typeof data.state === "string") {
            this.h.onState?.(data.state.toLowerCase());
        }

        if (!success) {
            const parts = [message, reason, errorCode].filter(Boolean);
            this.h.onError?.(parts.join(" - ") || "Server error");
        }

        switch (event) {
            case "stt": {
                const idx = Number(data.idx);
                const text = (data.text || "").toString();
                const kind = (data.kind || "").toString(); // 'interim' | 'final'
                if (Number.isInteger(idx) && text) {
                    this.h.onSTT?.(kind === "final" ? "final" : "interim", idx, text);
                }
                break;
            }
            case "llm": {
                const txt = (data.text || "").toString().trim();
                if (txt) this.h.onLLM?.(txt);
                break;
            }
            case "log": {
                this.h.onLog?.(data);
                break;
            }
            case "media": {
                this.h.onMedia?.(data, payload);
                break;
            }
            case "report:processing": {
                this.h.onReportProgress?.(data, payload);
                break;
            }
            case "report:complete": {
                this.h.onReportComplete?.(data, payload);
                break;
            }
            case "failure": {
                // error already surfaced
                break;
            }
            default:
                break;
        }
    }
}