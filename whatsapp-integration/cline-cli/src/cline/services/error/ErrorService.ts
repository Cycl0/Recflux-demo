export class ErrorService {
	private static serviceEnabled: boolean

	static initialize() {
	}

	static toggleEnabled(state: boolean) {
	}

	static setLevel(level: "error" | "all") {
	}

	static logException(error: Error): void {
	}

	static logMessage(message: string, level: "error" | "warning" | "log" | "debug" | "info" = "log"): void {
	}

	static isEnabled(): boolean {
		return ErrorService.serviceEnabled
	}
}
