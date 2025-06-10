import React, { useState, FormEvent, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import { useSharedState } from "@/context/BCContext";

// Helper components for consistent UI
const InputField = ({ label, ...props }) => (
  <div>
    <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-400 mb-1">
      {label}
    </label>
    <input
      {...props}
      className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-900 text-white placeholder-gray-500"
    />
  </div>
);

const FileInputField = ({ label, ...props }) => (
  <div>
    <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-400 mb-1">
      {label}
    </label>
    <input
      type="file"
      {...props}
      className="mt-1 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-300 hover:file:bg-indigo-500/20"
    />
  </div>
);

interface SongFormData {
  title: string;
  duration: string;
  imageFile: File | null;
  audioFile: File | null;
}

const UploadSongPage: React.FC = () => {
  const { token, address, isMusician } = useSharedState();
  
  const [formData, setFormData] = useState<SongFormData>({
    title: "",
    duration: "",
    imageFile: null,
    audioFile: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    setFormData((prev) => ({ ...prev, [name]: files && files.length > 0 ? files[0] : null }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (!token || !isMusician) {
      setError("Only authenticated musicians can upload songs.");
      setIsLoading(false);
      return;
    }

    const { title, duration, imageFile, audioFile } = formData;
    if (!title.trim() || !duration.trim() || !imageFile || !audioFile) {
      setError("Please fill all required fields and select both files.");
      setIsLoading(false);
      return;
    }

    const durationNum = parseFloat(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      setError("Duration must be a positive number.");
      setIsLoading(false);
      return;
    }

    const apiFormData = new FormData();
    apiFormData.append("title", title.trim());
    apiFormData.append("duration", durationNum.toString());
    apiFormData.append("imageFile", imageFile);
    apiFormData.append("audioFile", audioFile);

    try {
        const response = await axiosInstance.post("/song/add", apiFormData, {
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (response.data.success) {
        setSuccess(`Song "${response.data.data.title}" was added successfully!`);
        setFormData({ title: "", duration: "", imageFile: null, audioFile: null });
      } else {
        throw new Error(response.data.error?.message || "An unknown error occurred.");
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || "Failed to upload song.";
      console.error("Add song error:", err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!address || !isMusician) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-300">
        <h2 className="text-2xl font-bold text-white mb-4">Access Restricted</h2>
        <p className="text-gray-400 max-w-md">
          { !address 
            ? "Please connect your wallet and log in to add songs." 
            : "Only registered musicians can upload songs. Please complete your musician profile."
          }
        </p>
        <div className="mt-6">
          {address ? 
            <Link to="/musician/add" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-500">Become a Musician</Link> 
            : <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-500" disabled>Please Sign In</button>
          }
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-2xl">
      <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Upload a New Song
          </h1>
          <p className="mt-3 text-lg text-gray-400">Add a new track to your library. It can be added to an album later.</p>
      </div>
      
      {error && <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">{error}</div>}
      {success && <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg relative mb-6" role="alert">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6 bg-gray-900/50 border border-gray-700/50 rounded-xl p-8">
          <InputField 
            label="Song Title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            placeholder="e.g., Midnight Cruise"
          />

          <InputField 
            label="Duration (in seconds)"
            name="duration"
            type="number"
            value={formData.duration}
            onChange={handleInputChange}
            required
            min="1"
            placeholder="e.g., 180"
          />
          
          <FileInputField
            label="Song Cover Image"
            name="imageFile"
            accept="image/*"
            onChange={handleFileChange}
            required
          />
          {formData.imageFile && <p className="text-xs text-gray-500 -mt-4">Selected: {formData.imageFile.name}</p>}
          
          <FileInputField
            label="Audio File (MP3, WAV, etc.)"
            name="audioFile"
            accept="audio/*"
            onChange={handleFileChange}
            required
          />
          {formData.audioFile && <p className="text-xs text-gray-500 -mt-4">Selected: {formData.audioFile.name}</p>}

        <div className="pt-4 flex justify-end">
          <button
              type="submit"
              disabled={isLoading}
              className={`px-8 py-3 rounded-lg text-white font-semibold transition-all duration-300 ${
                  isLoading 
                  ? "bg-gray-500 cursor-not-allowed" 
                  : "bg-gradient-to-r from-indigo-500 to-pink-500 hover:shadow-lg hover:shadow-indigo-500/50"
              }`}
              >
              {isLoading ? "Uploading..." : "Upload Song"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UploadSongPage;