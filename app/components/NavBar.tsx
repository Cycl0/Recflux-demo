"use client";

import { Navbar } from "flowbite-react";

import Image from 'next/image';

export default function NavBar({ children }) {

 return (
        <Navbar
            fluid
            rounded
            className="fixed w-full z-20 top-0 start-0 backdrop-blur-md bg-black/[.06] md:bg-white/[.04]"
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

                <div className="flex items-center md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
                    {children}
                    <Navbar.Toggle className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm rounded-md md:hidden focus:outline-none focus:ring-2 text-blue-100 hover:bg-transparent  hover:shadow-gradient focus:ring-blue-100 transition-all duration-300 ease-in-out">
                        <span className="sr-only">Open main menu</span>
                        <svg
                            className="w-5 h-5"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 17 14"
                        >
                            <path
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M1 1h15M1 7h15M1 13h15"
                            />
                        </svg>
                    </Navbar.Toggle>
                </div>

                <Navbar.Collapse className="items-center justify-between hidden w-full md:flex md:w-auto md:order-1">
                    <Navbar.Link
                        href="#"
                        active
                        className="block py-2 px-3 text-white rounded md:bg-transparent md:text-blue-200 md:p-0 md:hover:text-white md:hover:shadow-gradient transition-colors duration-300 ease-in-out"
                    >
                        Início
                    </Navbar.Link>
                    <Navbar.Link
                        href="#"
                        className="block py-2 px-3 text-white rounded hover:bg-blue-800 md:hover:bg-transparent md:hover:text-white md:hover:shadow-gradient md:p-0 transition-colors duration-300 ease-in-out"
                    >
                        Sobre
                    </Navbar.Link>
                    <Navbar.Link
                        href="#"
                        className="block py-2 px-3 text-white rounded hover:bg-blue-800 md:hover:bg-transparent md:hover:text-white md:hover:shadow-gradient md:p-0 transition-colors duration-300 ease-in-out"
                    >
                        Planos
                    </Navbar.Link>
                    <Navbar.Link
                        href="#"
                        className="block py-2 px-3 text-white rounded hover:bg-blue-800 md:hover:bg-transparent md:hover:text-white md:hover:shadow-gradient md:p-0 transition-colors duration-300 ease-in-out"
                    >
                        Contato
                    </Navbar.Link>
                </Navbar.Collapse>
            </div>
        </Navbar>


    );

}
