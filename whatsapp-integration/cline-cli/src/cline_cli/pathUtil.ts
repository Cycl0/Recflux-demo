import path from "path"
import os from "os"

export function expandPath(p: string): string {
    if (p.startsWith("~/")) {
        p = p.replace("~/", os.homedir() + "/")
    }

    return path.resolve(p)
}
