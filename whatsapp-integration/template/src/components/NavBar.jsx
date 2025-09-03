import React from "react";

const NavBar = ({
  className = "",
  logo = null,
  brandName = "Marca",
  brandUrl = "/",
  navigationItems = [],
  rightSideItems = [],
  theme = {
    textColor: "text-white",
    hoverColor: "hover:text-blue",
    dropdownBg: "bg-gray-900/95",
    dropdownBorder: "border-gray-700/50",
    dropdownHover: "hover:bg-gray-700/50",
    buttonVariants: {
      outlined: "bg-transparent text-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900",
      contained: "bg-blue-600 text-white border border-blue-600 hover:bg-blue-700",
      text: "bg-transparent text-white border-none hover:bg-gray-700"
    }
  },
}) => {
  return (
    <header
      className={`absolute left-0 right-0 top-0 z-40 h-16 bg-transparent transition-colors duration-200 px-24 pt-0 ${className}`}
    >
      <div
        className="container relative z-10 flex h-full items-center"
        aria-label="Global"
      >
        {/* Logo */}
        <a
          className="transition-colors transition-all duration-200"
          href={brandUrl}
        >
          <span className="sr-only">{brandName}</span>
          {logo || <DefaultLogo brandName={brandName} />}
        </a>

        {/* Desktop Navigation - Hidden on mobile */}
        <nav className="ml-[77px] hidden md:block">
          <ul className="flex">
            {navigationItems.map((item, index) => (
              <NavigationItem key={index} item={item} theme={theme} />
            ))}
          </ul>
        </nav>

        {/* Right side items - Hidden on small screens */}
        <div className="ml-auto hidden gap-x-3.5 md:mr-[52px] sm:flex">
          {rightSideItems.map((item, index) => (
            <RightSideItem key={index} item={item} theme={theme} />
          ))}
        </div>
      </div>
    </header>
  );
};

// Navigation Item Component
const NavigationItem = ({ item, theme }) => {
  if (item.type === "dropdown") {
    return (
      <li className="group/navitem relative">
        <button
          className={`inline-flex items-center gap-x-1.5 whitespace-pre p-3 text-14 ${theme.textColor} font-inter-400`}
          type="button"
        >
          {item.label}
          <DropdownArrow />
        </button>
        <div className="invisible absolute top-full left-0 w-max mt-2 opacity-0 transition-[opacity,visibility] duration-200 group-hover/navitem:visible group-hover/navitem:opacity-100 z-50">
          <ul
            className={`flex min-w-[200px] flex-col rounded-lg border ${theme.dropdownBorder} ${theme.dropdownBg} backdrop-blur-sm py-2 shadow-xl`}
          >
            {item.items?.map((subItem, subIndex) => (
              <li key={subIndex} className="group/subitem">
                <a
                  className={`flex flex-col px-4 py-3 transition-colors duration-200 ${theme.dropdownHover}`}
                  href={subItem.href}
                  target={subItem.external ? "_blank" : undefined}
                  rel={subItem.external ? "noopener noreferrer" : undefined}
                >
                  <span
                    className={`text-14 leading-tight ${theme.textColor} font-inter-400`}
                  >
                    {subItem.label}
                  </span>
                  {subItem.description && (
                    <span className="mt-1 text-14 leading-tight text-gray-400 font-inter-300">
                      {subItem.description}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </li>
    );
  }

  // Regular link
  return (
    <li>
      <a
        className={`inline-flex whitespace-pre p-3 text-14 ${theme.textColor} font-inter-400 transition-colors duration-200 ${theme.hoverColor}`}
        href={item.href}
        target={item.external ? "_blank" : undefined}
        rel={item.external ? "noopener noreferrer" : undefined}
      >
        {item.label}
      </a>
    </li>
  );
};

// Right Side Item Component
const RightSideItem = ({ item, theme }) => {
  // Debug: log the item to see what's happening
  console.log('RightSideItem item:', item);
  
  if (item.type === "button") {
    // Force consistent styling for all buttons
    const buttonClasses = "relative inline-flex items-center justify-center px-4 py-2 text-sm font-inter-500 rounded-md bg-transparent text-white border border-white/30 hover:bg-white/10 focus:ring-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer";
    
    return (
      <a
        className={buttonClasses}
        href={item.href}
        target={item.external ? "_blank" : undefined}
        rel={item.external ? "noopener noreferrer" : undefined}
      >
        {item.label}
      </a>
    );
  }

  if (item.type === "icon-link") {
    return (
      <a
        className={`inline-flex items-center px-1.5 text-14 leading-none ${theme.textColor} font-inter-400 transition-colors duration-200 hover:text-gray-300`}
        href={item.href}
        target={item.external ? "_blank" : undefined}
        rel={item.external ? "noopener noreferrer" : undefined}
      >
        {item.icon}
        {item.label && <span className="ml-2 font-inter-400">{item.label}</span>}
      </a>
    );
  }

  // This fallback is creating the unstyled button - let's style it the same as buttons
  return (
    <a
      className="relative inline-flex items-center justify-center px-4 py-2 text-sm font-inter-500 rounded-md bg-transparent text-white border border-white/30 hover:bg-white/10 focus:ring-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer"
      href={item.href}
      target={item.external ? "_blank" : undefined}
      rel={item.external ? "noopener noreferrer" : undefined}
    >
      {item.label}
    </a>
  );
};

// Default Logo Component
const DefaultLogo = ({ brandName }) => (
  <div className="flex items-center">
    <div className="w-8 h-8 bg-white rounded mr-2 flex items-center justify-center">
      <span className="text-black font-bold text-lg">
        {brandName.charAt(0)}
      </span>
    </div>
    <span className="text-white font-inter-500 text-lg">{brandName}</span>
  </div>
);

// Dropdown Arrow Component
const DropdownArrow = () => (
  <img
    alt=""
    width="8"
    height="14"
    decoding="async"
    data-nimg="1"
    style={{ color: "transparent" }}
    src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAxMCA2Ij48cGF0aCBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMS40IiBkPSJtMSAxIDQgNCA0LTQiIG9wYWNpdHk9Ii42Ii8+PC9zdmc+"
  />
);

// GitHub Icon Component (example icon)
const GitHubIcon = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 36 36"
    className={className}
  >
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M18 .45c-9.9 0-18 8.1-18 18 0 7.988 5.175 14.738 12.263 17.1.9.113 1.237-.337 1.237-.9v-3.037c-5.062 1.125-6.075-2.363-6.075-2.363-.787-2.025-2.025-2.587-2.025-2.587-1.688-1.125.112-1.125.112-1.125 1.8.112 2.813 1.8 2.813 1.8 1.575 2.7 4.163 1.912 5.288 1.462a3.9 3.9 0 0 1 1.125-2.362c-4.05-.45-8.213-2.025-8.213-8.888 0-1.912.675-3.6 1.8-4.837-.225-.45-.787-2.25.225-4.725 0 0 1.462-.45 4.95 1.8 1.463-.45 2.925-.563 4.5-.563s3.038.225 4.5.563c3.488-2.363 4.95-1.913 4.95-1.913 1.012 2.475.338 4.275.225 4.725 1.125 1.238 1.8 2.813 1.8 4.838 0 6.862-4.163 8.437-8.213 8.887.675.563 1.238 1.688 1.238 3.375v4.95c0 .45.337 1.013 1.238.9C30.825 33.188 36 26.438 36 18.45c0-9.9-8.1-18-18-18"
      clipRule="evenodd"
    />
  </svg>
);

export default NavBar;

// Example usage configurations:
export const defaultNavBarConfig = {
  brandName: "Marca",
  brandUrl: "/",
  navigationItems: [
    {
      type: "link",
      label: "Preços",
      href: "/precos",
    },
    {
      type: "dropdown",
      label: "Recursos",
      items: [
        {
          label: "Blog",
          href: "/blog",
          description: "Leia nossas últimas novidades",
        },
        {
          label: "Documentação",
          href: "/docs",
          description: "Explore nossos tutoriais",
        },
        {
          label: "Novidades",
          href: "/novidades",
          description: "Veja o que há de novo",
        },
      ],
    },
    {
      type: "dropdown",
      label: "Comunidade",
      items: [
        {
          label: "Twitter",
          href: "https://twitter.com/empresa",
          description: "Siga nossas últimas notícias",
          external: true,
        },
        {
          label: "LinkedIn",
          href: "https://linkedin.com/company/empresa",
          description: "Receba atualizações",
          external: true,
        },
        {
          label: "GitHub",
          href: "https://github.com/empresa/projeto",
          description: "Nos dê uma estrela",
          external: true,
        },
      ],
    },
    {
      type: "link",
      label: "Download",
      href: "/download",
    },
  ],
  rightSideItems: [
    {
      type: "button",
      label: "Entrar",
      href: "/entrar",
      variant: "outlined"
    },
    {
      type: "button",
      label: "Cadastrar",
      href: "/cadastrar",
      variant: "contained"
    },
  ],
};
