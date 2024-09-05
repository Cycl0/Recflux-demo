export default function FileSelector ({ files, editorSideBarMode=false, editorOpen=true, handleFileSelect, selectedFileName, children, className}) {

  const fileNames = Object.keys(files);

  return (
    <section className={`${className}`}>
      <div className={`
        w-full
        ${editorOpen ? 'h-8 opacity-100' : 'h-0 opacity-0'}
        ${editorSideBarMode ? 'max-w-[344px]' : ''}
        flex flex-wrap justify-end divide-x-2 divide-transparent text-white
        transition-all transform-gpu ease-in-out duration-200
      `}>
        {children}
        {fileNames.map((fileName, index) => (
          <button
            key={fileName}
            className={`
              h-full px-4 flex-1 flex justify-center items-center
              backdrop-blur-xl hover:shadow-gradient
              ${selectedFileName === fileName ? "bg-blue-100 text-blue-500" : "bg-[rgba(193,219,253,0.15)]"}
              ${editorSideBarMode ? 'max-w-24' : ''}
              ${index === fileNames.length - 1 && !editorSideBarMode ? 'rounded-tr-md' : ''}
            `}
            onClick={handleFileSelect(fileName)}
            aria-label={`Selecionar arquivo ${fileName}`}
          >
            {fileName}
          </button>
        ))}
      </div>
    </section>
  );
}
