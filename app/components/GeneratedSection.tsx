"use client";import { useEffect, useState } from "react";
import { FlipTilt } from 'react-flip-tilt';
import Modal from "@/components/Modal";
import Select from 'react-select';
import ReactDiffViewer from 'react-diff-viewer';
import { useMemo } from 'react';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileCopyIcon from '@mui/icons-material/FileCopy';

export default function GeneratedSection({
    initialFiles, index, indexHandler,
    filesGenerated, setFilesGeneratedHandler,
    filesCurrent, setFilesCurrentHandler,
      handleFileSelect,
  throttleEditorOpen,
    filesRecentPrompt,
    demoThumbnails, demoUrl
}) {

    const [oldCode, setOldCode] = useState("");
    const [newCode, setNewCode] = useState("");

        const [selectedOldFileName, setSelectedOldFileName] = useState("index.html");
        const [selectedNewFileName, setSelectedNewFileName] = useState("index.html");

    const [selectedOldFile, setSelectedOldFile] = useState(null);
const [selectedNewFile, setSelectedNewFile] = useState(null);


    // diff
    const refreshDiff = () => {
        handleOldSelectChange(getLastOption(2, 0, selectedOldFileName)); // 2 is the index for 'Atual' group, offset 0 so it's last
    }

    const copyToCurrentFile = () => {
        setFilesCurrentHandler(selectedNewFileName, newCode);
        handleOldSelectChange(getLastOption(2, 0, selectedNewFileName)); // 2 is the index for 'Atual' group, offset 0 so it's last
        handleFileSelect(selectedNewFileName); // change the file in the editor
        throttleEditorOpen(true); // opennn the editor
    }


    // modal
    const [isModalOpen, setIsModalOpen] = useState(false);

    const toggleModal = () => {
        setIsModalOpen(!isModalOpen);
    };

    // select
   const options = useMemo(() => {
    const createOptionsGroup = (filesArray, groupLabel) => {
        const options = filesArray.flatMap((files, index) =>
            Object.entries(files)
                .map(([key, file]) => ({
                    value: `${groupLabel}_${index}_${key}`,
                    label: file.name + (file.desc ? ` - <<${file.desc}>>` : ``),
                }))
        );

        // Sort options by the label, ensuring that files with the same name are grouped together
        return {
            label: groupLabel,
            options: options.sort((a, b) => {
                // Extract base file names and descriptions
                const [aBaseName, aDesc] = a.label.split(' - ');
                const [bBaseName, bDesc] = b.label.split(' - ');

                // First, sort by base file name
                const baseNameComparison = aBaseName.localeCompare(bBaseName);
                if (baseNameComparison !== 0) {
                    return baseNameComparison;
                }

                // Then, sort by the presence of description (no description first)
                if (!aDesc && bDesc) return -1;
                if (aDesc && !bDesc) return 1;

                // If both have descriptions, or both don't, they are already equal
                return 0;
            }),
        };
    };

    return [
        createOptionsGroup(filesRecentPrompt, 'Prompts enviados'),
        createOptionsGroup(filesGenerated, 'Gerado'),
        createOptionsGroup([filesCurrent[0]], 'Atual'),
    ];
}, [filesRecentPrompt, filesGenerated, filesCurrent, index]);


// Function to get the last option from a group
    const getLastOption = (groupIndex, offset, fileName) => {
        const groupOptions = options[groupIndex]?.options;
    if (groupOptions && groupOptions.length > 0) {
        let matchCount = 0;
        for (let i = groupOptions.length - 1; i >= 0; i--) {
            if (groupOptions[i].label.startsWith(fileName)) {
                ++matchCount;
                if (matchCount == offset + 1) {
                    return groupOptions[i];
                }
            }
        }
    }
    return null;
};

    useEffect(() => {

    // Set the old file (current)
    const oldFileOption = getLastOption(1, 1, selectedOldFileName); // 1 is the index for 'Gerado' group, offset 1 so it's second from last
    if (oldFileOption) {
        handleOldSelectChange(oldFileOption);
    }

    // Set the new file (generated)
    const newFileOption = getLastOption(1, 0, selectedNewFileName); // 1 is the index for 'Gerado' group, offset 0 so it's last
    if (newFileOption) {
        handleNewSelectChange(newFileOption);
    }
}, [filesGenerated, index, options]);

// Modify the handle functions to work with the full option object
const handleOldSelectChange = (selectedOption) => {
    const [group, indexStr, fileName] = selectedOption.value.split('_');
    const fileIndex = parseInt(indexStr, 10);
    let fileContent = '';
    if (group === 'Prompts enviados') {
        fileContent = filesRecentPrompt[fileIndex][fileName].value;
    } else if (group === 'Gerado') {
        fileContent = filesGenerated[fileIndex][fileName].value;
    } else if (group === 'Atual') {
        fileContent = filesCurrent[fileIndex][fileName].value;
    }
    setOldCode(fileContent);
    setSelectedOldFile(selectedOption);
    setSelectedOldFileName(fileName);
};

const handleNewSelectChange = (selectedOption) => {
    const [group, indexStr, fileName] = selectedOption.value.split('_');
    const fileIndex = parseInt(indexStr, 10);
    let fileContent = '';
    if (group === 'Prompts enviados') {
        fileContent = filesRecentPrompt[fileIndex][fileName].value;
    } else if (group === 'Gerado') {
        fileContent = filesGenerated[fileIndex][fileName].value;
    } else if (group === 'Atual') {
        fileContent = filesCurrent[fileIndex][fileName].value;
    }
    setNewCode(fileContent);
    setSelectedNewFile(selectedOption);
    setSelectedNewFileName(fileName);
};


    // Select style

    const colors = {
        'blue': {
          0: '#f0feff',
          50: '#e0fdff',
          100: '#bafbff',
          200: '#94f8ff',
          300: '#6ef5ff',
          400: '#60efff',  // Default
          500: '#00e1ff',
          600: '#00b8d4',
          700: '#0090a8',
          800: '#006b7d',
          900: '#004552',
          1000: '#002029',
        },
        'green': {
          0: '#e6fff4',
          50: '#ccffe9',
          100: '#99ffd3',
          200: '#66ffbd',
          300: '#33ffa7',
          400: '#00ff87',  // Default
          500: '#00e67a',
          600: '#00cc6c',
          700: '#00b35e',
          800: '#009950',
          900: '#008042',
          1000: '#006634',
        },
    }

    const customStyleSelect = {
        control: (provided) => ({
            ...provided,
            backgroundColor: 'rgba(193,219,253,0.15)',
            backdropFilter: 'blur(10px)',
            '&:hover': {
                cursor: 'pointer'
            },
            color: 'white'
        }),
        option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? colors.blue[200] : 'transparent',
    color: state.isSelected ? colors.blue[900] : colors.blue[700],
    '&:hover': {
        backgroundColor: colors.blue[300],
        color: colors.blue[900],
        cursor: 'pointer'
    },
    '&:focus': {
        outline: 'none',
        cursor: 'pointer'
    },
    transition: 'all 0.2s ease',
    borderRadius: '4px',
    margin: '2px 0',
    padding: '10px 12px',
    fontWeight: state.isSelected ? '500' : '400',
    boxShadow: state.isSelected ? `0 2px 5px ${colors.blue[300]}50` : 'none'
}),
        singleValue: (provided) => ({
            ...provided,
            color: 'white'
        }),
        input: (provided) => ({
            ...provided,
            color: 'white'
        }),
        placeholder: (provided) => ({
            ...provided,
            color: 'rgba(255, 255, 255, 0.7)'
        }),
        group: (provided) => ({
            ...provided,
            padding: 0
        }),
        groupHeading: (provided) => ({
            ...provided,
            backgroundColor: 'rgba(0, 100, 150, 0.9)',
            color: '#FFFFFF',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            padding: '8px 12px',
            fontSize: '14px',
            borderBottom: '2px solid #60efff'
        }),
        dropdownIndicator: (provided, state) => ({
            ...provided,
            color: 'white',
            '&:hover': {
                color: '#60efff'
            }
        }),
        indicatorSeparator: (provided) => ({
            ...provided,
            backgroundColor: 'white'
        }),
    };

    return (
        <div className={`max-w-full flex flex-col items-center justify-center mt-32`}>
            <div className={`2xl:w-[28%] xl:w-[36%] md:w-1/2 relative`}>
                <div className={`absolute -top-6 -left-6 w-1/3 h-1/3 border-t-2 border-l-2 border-blue-400`} />
                <div className={`absolute -bottom-6 -right-6 w-1/3 h-1/3 border-b-2 border-r-2 border-green-400`} />
                <FlipTilt
                    className={`w-full h-full cursor-pointer`}
                    onClick={toggleModal}
                    front={demoThumbnails[index]}
                    back={demoThumbnails[index]}
                    borderColor='#60efff'
                />
            </div>
            <div className={`w-full flex items-center justify-center mt-20 relative`}>
                <Select
                    options={options}
                    onChange={handleOldSelectChange}
                    value={selectedOldFile}
                    styles={customStyleSelect}
                    className="w-full"
                    placeholder="Selecione um arquivo para comparar"
                />
                <Select
                    options={options}
                    onChange={handleNewSelectChange}
                    value={selectedNewFile}
                    styles={customStyleSelect}
                    className="w-full"
                    placeholder="Selecione um arquivo para comparar"
                />
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        refreshDiff();
                    }}
                    className={`!absolute
                        left-0 top-10
                        w-10 h-10 bg-[rgba(193,219,253,0.15)] backdrop-blur-md text-white
                        p-1.5 hover:shadow-gradient
                        transition-all transform-gpu  ease-in-out duration-200
                      `}>
                    <RefreshIcon />
                </button>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        copyToCurrentFile();
                    }}
                    className={`!absolute
                        right-0 top-10
                        w-10 h-10 bg-[rgba(193,219,253,0.15)] backdrop-blur-md text-white
                        p-1.5 hover:shadow-gradient
                        transition-all transform-gpu  ease-in-out duration-200
                      `}>
                    <FileCopyIcon />
                </button>
            </div>
            <ReactDiffViewer oldValue={oldCode} newValue={newCode} splitView={false} />
            <Modal
                isOpen={isModalOpen}
                onClose={toggleModal}
                url={demoUrl[index]}
            >
            </Modal>
        </div >
    );
}
