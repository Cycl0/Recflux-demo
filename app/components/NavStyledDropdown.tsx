import React, { useState, useEffect } from "react";
import { Dropdown, Avatar } from "flowbite-react";

export default function NavStyledDropdown({ name, email, avatarUrl, onLogout }) {
  const [imgSrc, setImgSrc] = useState(avatarUrl && avatarUrl.startsWith('http') ? avatarUrl : "/images/icon.png");
  useEffect(() => {
    setImgSrc(avatarUrl && avatarUrl.startsWith('http') ? avatarUrl : "/images/icon.png");
  }, [avatarUrl]);
  const handleImgError = () => {
    setImgSrc("/images/icon.png");
  };

  return (
    <Dropdown
      arrowIcon={false}
      inline
      label={
        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-black/10">
          <Avatar
            className="hover:shadow-gradient focus:shadow-gradient w-10 h-10 space-x-0"
            alt={name || "User"}
            img={imgSrc}
            rounded
            children={<img src={imgSrc} alt="" style={{ display: 'none' }} onError={handleImgError} />}
          />
        </div>
      }
      className="backdrop-blur-xl bg-black/[0.1] border-none shadow-gradient"
    >
      <Dropdown.Header className="text-white border-none">
        <span className="block text-sm">{name}</span>
        <span className="block truncate text-sm font-medium">{email}</span>
      </Dropdown.Header>
      <Dropdown.Item className="
                                text-white bg-transparent
                                focus:bg-transparent
                                hover:bg-transparent hover:shadow-gradient hover:text-white
                                transition-all duration-300">
        Dashboard
      </Dropdown.Item>
      <Dropdown.Divider />
      <Dropdown.Item
        className="text-white bg-transparent focus:bg-transparent hover:bg-transparent hover:shadow-gradient hover:text-white transition-all duration-300"
        onClick={onLogout}
      >
        Sair
      </Dropdown.Item>
    </Dropdown>
  );
}

