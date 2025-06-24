"use client";

import NavStyledCollapse from '@/components/NavStyledCollapse';
import { Navbar } from 'flowbite-react';
import Image from 'next/image';

export default function NavBar({ extra }) {

  return (
    <Navbar
      fluid
      rounded
      className="z-[2147483647] fixed w-full z-20 top-0 start-0 backdrop-blur-md bg-black/[.06] md:bg-white/[.04] noselect"
    >
      <div className="w-full flex flex-wrap items-center justify-between mx-auto px-4">
        <Navbar.Brand
          href="https://recflux-demo.vercel.app/"
          className="flex items-center space-x-3 rtl:space-x-reverse hover:shadow-gradient"
        >
          <Image
            src="/images/icon.png"
            width={32}
            height={32}
            className="h-8"
            alt="Recflux Logo"
          />
          <span className="self-center whitespace-nowrap text-2xl font-semibold text-white">
            Recflux
          </span>
        </Navbar.Brand>

        <div className="flex md:order-2 items-center">
          {extra}
          <Navbar.Toggle className="ml-2 inline-flex items-center p-2 w-10 h-10 justify-center text-sm rounded-md md:hidden focus:outline-none focus:ring-2 text-blue-100 hover:bg-transparent hover:shadow-gradient focus:ring-blue-100 transition-all duration-300 ease-in-out" />
        </div>

        <NavStyledCollapse
          className="md:flex md:w-auto md:order-1 md:mx-auto"
          list={[
            "Início", "/",
            "Sobre", "/pages/sobre",
            "Planos", "/pages/planos",
            "Contato", "/pages/contato"
          ]}
          activeIndex={0}
        />
      </div>
    </Navbar>
    );
}
