import React from "react";
import { X, Check } from "lucide-react";
import toast from "react-hot-toast";
import { User } from "./page";
import { backendUrl } from "./backend";
import Image from "next/image";

type DialogBoxProps = {
  user: User | null;
  isOpen: boolean;
  id: string;
  imgUrl?: string;
  caption: string;
  onClose: () => void;
};

const DialogBox: React.FC<DialogBoxProps> = ({
  isOpen,
  user,
  id,
  imgUrl,
  caption,
  onClose,
}) => {
  const [inputValue, setInputValue] = React.useState(caption || "");

  
  const handleUpdatePost = async (e: React.MouseEvent) => {
    try {
      if (!user) {
        toast.error("User not authenticated");
        return;
      }
      e.preventDefault();
      toast.loading("Updating post...");
      
      const response = await fetch(`${backendUrl}/update-post/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ post: inputValue }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update post");
      }
      
      const data = await response.json();
      console.log("Post updated:", data);
      toast.dismiss();
      if (data.status) {
        toast.success("Post updated successfully");
      } else {
        toast.error("Failed to update post");
      }
    } catch (error) {
      toast.dismiss();
      console.error("Error updating post:", error);
      toast.error("Error updating post");
    } finally {
      onClose();
    }
  };

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-md transition-opacity duration-300">
      <div className="bg-gray-900 rounded-xl w-full max-w-md p-6 shadow-2xl border border-gray-800 relative transform transition-all duration-300 ease-in-out">
        {/* Decorative gradient accent */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-t-xl"></div>

        <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
          <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Edit Your Post
          </span>
        </h2>

        <div className="mb-6">
          {/* Image preview with better styling */}
          {imgUrl && (
            <div className="relative mb-4 rounded-lg overflow-hidden shadow-lg border border-gray-700">
              <Image
                src={imgUrl}
                width={500}
                height={300}
                alt="Post preview"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
            </div>
          )}

          {/* Input with improved styling */}
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Caption
          </label>
          <textarea
            rows={4}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-100 placeholder-gray-500"
            placeholder="Edit your post..."
          />
        </div>

        {/* Close button in the top-right corner */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors duration-200"
          onClick={onClose}
          aria-label="Close">
          <X size={20} />
        </button>

        {/* Action buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700 flex items-center gap-2">
            Cancel
          </button>
          <button
            onClick={handleUpdatePost}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center gap-2">
            <Check size={18} />
            Update Post
          </button>
        </div>
      </div>
    </div>
  );
};

export default DialogBox;
