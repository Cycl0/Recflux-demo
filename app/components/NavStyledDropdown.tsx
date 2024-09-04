import { Dropdown, Avatar } from "flowbite-react";

export default function NavStyledDropdown() {
  return (
    <Dropdown
      arrowIcon={false}
      inline
      label={
        <Avatar className="hover:shadow-gradient focus:shadow-gradient" alt="Configurações do usuário" img="/images/icon.png" rounded />
      }
      className="backdrop-blur-xl bg-black/[0.1] border-none shadow-gradient"
    >
      <Dropdown.Header className="text-white border-none">
        <span className="block text-sm">Lucas</span>
        <span className="block truncate text-sm font-medium">lucas@email.com</span>
      </Dropdown.Header>
      <Dropdown.Item className="
                                text-white bg-transparent
                                focus:bg-transparent
                                hover:bg-transparent hover:shadow-gradient hover:text-white
                                transition-all duration-300">
        Dashboard
      </Dropdown.Item>
      <Dropdown.Divider />
      <Dropdown.Item className="
                                text-white bg-transparent
                                focus:bg-transparent
                                hover:bg-transparent hover:shadow-gradient hover:text-white
                                transition-all duration-300">
        Sair
      </Dropdown.Item>
    </Dropdown>
  );
};
