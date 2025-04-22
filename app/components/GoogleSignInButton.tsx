"use client";

import React from "react";
import { GoogleLogin } from "@react-oauth/google";

interface GoogleSignInButtonProps {
  onSuccess?: (credentialResponse: any) => void;
  onError?: () => void;
  buttonText?: string;
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  buttonText = "Sign in with Google"
}) => {
  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={onSuccess}
        onError={onError}
        useOneTap
      />
    </div>
  );
};

export default GoogleSignInButton;
