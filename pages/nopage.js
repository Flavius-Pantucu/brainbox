export default function NoPage(props) {
  return (
    <div className="mt-10 mx-auto w-4/5 max-w-7xl px-2 sm:px-6 lg:px-8">
      <h1
        className={`text-3xl 
        ${props.theme == "dark" ? "text-white" : "text-neutral-900"}`}>
        Page Not Found
      </h1>
    </div>
  );
}
