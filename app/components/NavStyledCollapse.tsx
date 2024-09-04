import { Navbar } from "flowbite-react";

export default function NavCollapse ({ className, list, activeIndex = 0 }) {
  if (list.length % 2 !== 0) {
    console.error("NavCollapse: List must have an even number of elements (label-URL pairs)");
    return null;
  }

  const navItems = [];
  for (let i = 0; i < list.length; i += 2) {
    navItems.push({ label: list[i], url: list[i + 1] });
  }

  return (
    <Navbar.Collapse className={className}>
      <div className="flex flex-col md:flex-row md:space-x-8 mt-4 md:mt-0">
        {navItems.map((item, index) => (
          <Navbar.Link
            key={item.url}
            href={item.url}
            className={`
              ${index === activeIndex
                ? `border-b border-blue-100 shadow-gradient`
                : ``
              }
              text-white hover:bg-blue-100/[.05] bg-transparent
              hover:text-white hover:shadow-gradient
              transition-colors duration-300 ease-in-out
            `}
          >
            {item.label}
          </Navbar.Link>
        ))}
      </div>
    </Navbar.Collapse>
  );
};
