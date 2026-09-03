export default function Container(props) {
  return (
    <div
      className={`h-screen overflow-y-auto w-full transition-all ease-in duration-200 font-mono
      ${props.theme == "dark" ? "bg-gray-800" : "bg-slate-100"}`}>
      {props.children}
    </div>
  );
}
