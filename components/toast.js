export default function Toast(props) {
  const closeToast = () => {
    props.closeToast();
  };

  const theme = props.theme;
  const toast = props.toast;

  return (
    <div
      role="alert"
      id="toast-top-right"
      onClick={closeToast}
      className={`absolute flex items-center justify-between w-72 max-w-xs p-4 rounded-lg shadow-lg top-20 right-5 transition-all ease-in-out duration-300 
      ${toast.type == "success" ? " opacity-100" : "opacity-0"}`}>
      <div
        className={`text-sm font-normal 
        ${theme == "dark" ? "text-cyan-400" : "text-gray-900"}`}>
        {toast.message}
      </div>
      <svg
        aria-hidden="true"
        data-prefix="fas"
        data-icon="paper-plane"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
        focusable="false"
        viewBox="0 0 512 512"
        className={`w-4 h-4
          ${theme == "dark" ? "text-cyan-400" : "text-gray-900"}`}>
        <path
          fill="currentColor"
          d="M48 80a48 48 0 1 1 96 0A48 48 0 1 1 48 80zM0 224c0-17.7 14.3-32 32-32H96c17.7 0 32 14.3 32 32V448h32c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H64V256H32c-17.7 0-32-14.3-32-32z"></path>
      </svg>
    </div>
  );
}
