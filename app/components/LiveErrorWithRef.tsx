import { LiveError } from "react-live";
import React from "react";

// Forwards ref to the root div, so parent can querySelector('pre')
const LiveErrorWithRef = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof LiveError>>(
  (props, ref) => (
    <div ref={ref}>
      <LiveError {...props} />
    </div>
  )
);

export default LiveErrorWithRef;
