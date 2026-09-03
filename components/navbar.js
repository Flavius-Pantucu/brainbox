import { Fragment, useState } from "react";
import { Disclosure, Menu, Transition } from "@headlessui/react";
import { Bars3Icon, BellIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Navbar(props) {
  const [elements, setElements] = useState(props.elements);
  const theme = props.theme;

  const openLogin = () => {
    props.childSetModal("login");
  };

  const changeTheme = () => {
    props.childSetTheme(theme == "dark" ? "light" : "dark");
  };

  const changeNavigation = (name) => {
    elements.forEach((elem, index) => {
      if (elem.name === name) elements[index].current = true;
      else elements[index].current = false;
    });
    setElements((elements) => [...elements]);
    props.selectGame(name);
  };

  return (
    <Disclosure as="nav">
      {({ open }) => (
        <>
          <div className="border-b border-slate-300/30">
            <div className="mx-auto lg:w-5/6 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="relative flex h-16 items-center justify-between">
                <div className="absolute inset-y-0 left-0 flex items-center lg:hidden">
                  <Disclosure.Button
                    className={`inline-flex items-center justify-center rounded-md p-1 
                 ${
                   theme == "dark"
                     ? "text-gray-400 hover:bg-gray-700 hover:text-white  focus:ring-white"
                     : ""
                 } `}>
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                </div>
                <div className="flex flex-1 items-center ml-10 lg:ml-0 justify-start sm:items-stretch sm:justify-start">
                  <div className="flex flex-shrink-0 items-center">
                    <Link href="/">
                      <Image
                        className="block lg:hidden"
                        src="/images/logo.png"
                        alt="GameHub Company"
                        height={35}
                        width={40}
                      />
                      <Image
                        className="hidden lg:block"
                        src="/images/logo.png"
                        alt="GameHub Company"
                        height={35}
                        width={40}
                      />
                    </Link>
                  </div>
                  <div className="hidden sm:ml-6 lg:block">
                    <div className="flex space-x-4">
                      {elements.map((item) => (
                        <Link
                          key={item.name}
                          href="/"
                          onClick={() => changeNavigation(item.name)}
                          className={classNames(
                            item.current
                              ? theme == "dark"
                                ? "bg-gray-900 text-white"
                                : "bg-gray-900 text-white"
                              : theme == "dark"
                              ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                              : "text-neutral-600 hover:bg-gray-300 hover:text-neutral-900",
                            "px-3 py-2 rounded-md text-sm md:text-base font-medium transition-all ease-in duration-200"
                          )}
                          aria-current={item.current ? "page" : undefined}>
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  {props.session === true ? (
                    <Menu as="div" className="relative ml-3">
                      <div>
                        <Menu.Button className="flex rounded-full bg-gray-800 text-sm">
                          <span className="sr-only">Open user menu</span>
                          <Image
                            className="rounded-full"
                            src="/images/profile.jpg"
                            alt="My Profile"
                            width={40}
                            height={40}
                          />
                        </Menu.Button>
                      </div>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95">
                        <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <Menu.Item>
                            {({ active }) => (
                              <a
                                href="/"
                                className={classNames(
                                  active ? "bg-gray-100" : "",
                                  "block px-4 py-2 text-sm text-gray-700"
                                )}>
                                Your Profile
                              </a>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <a
                                href="/"
                                className={classNames(
                                  active ? "bg-gray-100" : "",
                                  "block px-4 py-2 text-sm text-gray-700"
                                )}>
                                Settings
                              </a>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <a
                                href="/"
                                className={classNames(
                                  active ? "bg-gray-100" : "",
                                  "block px-4 py-2 text-sm text-gray-700"
                                )}>
                                Sign out
                              </a>
                            )}
                          </Menu.Item>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  ) : (
                    <>
                      <button
                        onClick={openLogin}
                        className={`text-xs w-16 h-8 md:w-20 md:h-10 md:text-sm items-center justify-center rounded-lg hover:text-white transition-all duration-300 ease-in-out
                        ${
                          theme == "dark"
                            ? "text-white hover:bg-cyan-500"
                            : "text-neutral-900 hover:bg-cyan-500"
                        }`}>
                        <span className={`bg-transparent`}>Login</span>
                      </button>
                    </>
                  )}
                </div>
                <div className="ml-4 cursor-pointer" onClick={changeTheme}>
                  {theme == "dark" ? (
                    <svg
                      aria-hidden="true"
                      className="w-6 h-4 text-slate-100"
                      focusable="false"
                      data-prefix="fas"
                      data-icon="paper-plane"
                      role="img"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 512 512">
                      <path
                        fill="currentColor"
                        d="M288 80c-65.2 0-118.8 29.6-159.9 67.7C89.6 183.5 63 226 49.4 256c13.6 30 40.2 72.5 78.6 108.3C169.2 402.4 222.8 432 288 432s118.8-29.6 159.9-67.7C486.4 328.5 513 286 526.6 256c-13.6-30-40.2-72.5-78.6-108.3C406.8 109.6 353.2 80 288 80zM95.4 112.6C142.5 68.8 207.2 32 288 32s145.5 36.8 192.6 80.6c46.8 43.5 78.1 95.4 93 131.1c3.3 7.9 3.3 16.7 0 24.6c-14.9 35.7-46.2 87.7-93 131.1C433.5 443.2 368.8 480 288 480s-145.5-36.8-192.6-80.6C48.6 356 17.3 304 2.5 268.3c-3.3-7.9-3.3-16.7 0-24.6C17.3 208 48.6 156 95.4 112.6zM288 336c44.2 0 80-35.8 80-80s-35.8-80-80-80c-.7 0-1.3 0-2 0c1.3 5.1 2 10.5 2 16c0 35.3-28.7 64-64 64c-5.5 0-10.9-.7-16-2c0 .7 0 1.3 0 2c0 44.2 35.8 80 80 80zm0-208a128 128 0 1 1 0 256 128 128 0 1 1 0-256z"></path>
                    </svg>
                  ) : (
                    <svg
                      aria-hidden="true"
                      className="w-6 h-4 text-gray-800"
                      focusable="false"
                      data-prefix="fas"
                      data-icon="paper-plane"
                      role="img"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 512 512">
                      <path
                        fill="currentColor"
                        d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z"></path>
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
          <Transition
            as={Fragment}
            className="transition-all duration-700 overflow-hidden"
            enterFrom="transform scale-0 opacity-0 max-h-0"
            enterTo="transform scale-100 opacity-100 max-h-[200px]"
            leaveFrom="transform scale-100 opacity-100 max-h-[200px]"
            leaveTo="transform scale-0 opacity-0 max-h-0">
            <Disclosure.Panel className="flex justify-center lg:hidden origin-top w-full">
              <div className="space-y-1 px-2 pt-2 pb-3 w-full">
                {elements.map((item) => (
                  <Disclosure.Button
                    key={item.name}
                    as="a"
                    onClick={() => changeNavigation(item.name)}
                    className={classNames(
                      item.current
                        ? "bg-gray-900 text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white",
                      "block px-3 py-2 rounded-md text-base font-medium cursor-pointer"
                    )}
                    aria-current={item.current ? "page" : undefined}>
                    {item.name}
                  </Disclosure.Button>
                ))}
              </div>
            </Disclosure.Panel>
          </Transition>
        </>
      )}
    </Disclosure>
  );
}
