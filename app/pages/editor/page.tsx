import dynamic from "next/dynamic";
export default dynamic(() => import("./HomeImpl"), { ssr: false });