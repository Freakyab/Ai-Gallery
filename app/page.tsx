"use client";
import {
  BellDot,
  Bookmark,
  ChevronDownSquareIcon,
  CircleUser,
  FileImage,
  Heart,
  Home,
  Loader2,
  LogIn,
  LogOut,
  MessageCircle,
  Sparkles,
  Trash,
  Users,
  X,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  GoogleOAuthProvider,
  googleLogout,
  useGoogleLogin,
} from "@react-oauth/google";
import React from "react";
import { backendUrl } from "./backend";
import { toast } from "react-hot-toast";
console.log(backendUrl);

type User = {
  email: string;
  name: string;
  picture: string;
  _id: string;
  token: string;
};

type Post = {
  _id: string;
  username: string;
  avatar: string;
  post: string;
  createdAt: string;
  image?: string;
  like: number;
  comment: number;
  share: number;
  isEditable: boolean;
  isLiked: boolean;
  isSaved: boolean;
};

type Community = {
  _id: string;
  title: string;
  description: string;
  members: number;
  image: string;
  isMember: boolean;
};

type Notification = {
  commentId?: string;
  community?: string;
  postId?: string;
  isCommunity: Boolean;
  _id: string;
  avatar: string;
  createdAt: string;
  desc: string;
  isRead: boolean;
  name: string;
};

type Comment = {
  liked: string[];
  _id: string;
  postId: string;
  userId: string;
  likes: number;
  avatar: string;
  username: string;
  image: string;
  isLiked: boolean;
  comment: string;
  createdAt: string;
  isEditable: boolean;
};

const formattedTime = (time: string) => {
  const date = new Date(time);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  } else {
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  }
};

export default function Page() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isActiveTab, setIsActiveTab] = React.useState("feed");
  const searchParams = useSearchParams();
  const community = searchParams.get("community");
  const postId = searchParams.get("post");
  const commentOpen = searchParams.get("comments");
  const profile = searchParams.get("profile");
  const saved = searchParams.get("saved");
  const router = useRouter();

  React.useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }

    if (user === null) {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      }
    }
  }, [user]);

  const Sidebar = () => {
    const [isLoading, setIsLoading] = React.useState(false);

    const login = useGoogleLogin({
      onSuccess: async (tokenResponse) => {
        try {
          setIsLoading(true);
          // Get user info from Google
          const userInfoResponse = await fetch(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
              headers: {
                Authorization: `Bearer ${tokenResponse.access_token}`,
              },
            }
          );
          const userInfo = await userInfoResponse.json();

          // Login to your backend
          const response = await fetch(`${backendUrl}/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: userInfo.email,
              password: userInfo.sub + userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
            }),
          });
          const data = await response.json();
          if (data.status) {
            setUser(data.user);
          }
        } catch (error) {
          console.error("Error during login:", error);
        } finally {
          setIsLoading(false);
        }
      },
      onError: () => {
        console.error("Login Failed");
      },
    });

    const IconWithName = ({
      onClick,
      title,
      icon,
    }: {
      onClick: () => void;
      title: string;
      icon: React.ReactNode;
    }) => {
      return (
        <button
          onClick={onClick}
          className="flex items-center gap-4 p-3 hover:bg-gray-900 rounded-full transition-colors">
          {icon}
          <span className="text-xl sm:hidden lg:block">{title}</span>
        </button>
      );
    };
    return (
      <div className="hidden sm:w-[10%] lg:w-[35%] h-screen sm:flex flex-col gap-4 p-4">
        <div className="flex justify-center p-4">
          {/* X/Twitter Logo placeholder */}
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8 text-white"
            fill="currentColor">
            <g>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </g>
          </svg>
        </div>

        <nav className="flex flex-col h-full justify-between mb-6 gap-2">
          <div>
            <IconWithName
              title="Home"
              icon={<Home size={24} />}
              onClick={() => {
                setIsActiveTab("feed");
                router.push("/");
              }}
            />

            <IconWithName
              title="Notifications"
              icon={<BellDot size={24} />}
              onClick={() => {
                setIsActiveTab("notifications");
                router.push("/");
              }}
            />

            <IconWithName
              title="Profile"
              icon={<CircleUser size={24} />}
              onClick={() => {
                if (!user) toast.error("Please login to view profile");
                router.push("/?profile=true");
              }}
            />
            <IconWithName
              title="Saved"
              icon={<Bookmark size={24} />}
              onClick={() => {
                if (!user) toast.error("Please login to view profile");
                router.push("/?saved=true");
              }}
            />

            <IconWithName
              title="AI Post"
              icon={<Sparkles size={24} />}
              onClick={async () => {
                if (!user) {
                  toast.error("Please login to generate posts");
                  return;
                }
                toast.loading("Generating a random post...");
                const response = await fetch(
                  `${backendUrl}/create-random-post`,
                  {
                    method: "GET",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${user.token}`,
                    },
                  }
                );
                const data = await response.json();
                toast.dismiss();
                if (!data.status) {
                  toast.error("Failed to generate post");
                  return;
                }
                toast.success("Post generated successfully");
                router.push(`/?post=${data.post._id}&comments=true`);
                // router.push("/?generate=true");
              }}
            />
          </div>

          {!user ? (
            <button
              onClick={() => {
                login();
              }}
              className="w-full">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 p-2 rounded-full">
                  <Loader2 className="text-white animate-spin" size={24} />
                  <p>Loading</p>
                </div>
              ) : (
                <div className="w-full border border-gray-200/20 flex items-center md:gap-4 p-2 hover:bg-gray-900 rounded-full transition-colors ">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-10 h-10 lg:w-8 lg:h-8"
                    viewBox="0 0 48 48">
                    <path
                      fill="#FFC107"
                      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                    <path
                      fill="#FF3D00"
                      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                    <path
                      fill="#4CAF50"
                      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                    <path
                      fill="#1976D2"
                      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                  </svg>
                  <span className="text-xl sm:hidden lg:block">Sign in</span>
                </div>
              )}
            </button>
          ) : (
            <IconWithName
              title="Logout"
              icon={<LogOut size={24} />}
              onClick={handleUserLogout}
            />
          )}
        </nav>
      </div>
    );
  };

  const Feed = () => {
    const [posts, setPosts] = React.useState<Post[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
      const fetchPosts = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`${backendUrl}/posts/${user?._id}`);
          const data = await response.json();
          if (!data.status) {
            toast.error("Failed to fetch posts");
            return;
          }
          setPosts(data.posts);
        } catch (error) {
          console.error("Error fetching posts:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchPosts();
    }, [user]);

    return (
      <div
        className={`${
          isActiveTab === "community" && "hidden"
        } w-full h-screen border-l border-gray-200/20 overflow-hidden`}>
        <div className="flex items-center justify-evenly border-b backdrop-blur-sm bg-gray-100/10 shadow-lg">
          <p
            onClick={() => setIsActiveTab("feed")}
            className={`p-4 cursor-pointer ${
              isActiveTab === "feed" && "border-blue-400 border-b-2"
            }`}>
            Feed
          </p>
          <p
            onClick={() => setIsActiveTab("notifications")}
            className={`p-4 cursor-pointer ${
              isActiveTab === "notifications" && "border-blue-400 border-b-2"
            }`}>
            Notifications
          </p>
        </div>
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="text-white animate-spin" size={24} />
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No posts available</p>
          </div>
        )}
        <div
          className="overflow-auto h-[calc(100vh-80px)]"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#4B5563 #1F2937" }}>
          {isActiveTab === "feed" ? (
            <React.Fragment>
              <UploadPost />
              {posts.map((item, index) => (
                <div key={index} className="border-b border-gray-200/20">
                  <Posts item={item} setPosts={setPosts} />
                </div>
              ))}
            </React.Fragment>
          ) : (
            <Notification />
          )}
        </div>
      </div>
    );
  };

  const PostWithComments = () => {
    const [post, setPost] = React.useState<Post | null>(null);
    const [comments, setComments] = React.useState<Comment[]>([]);
    const [comment, setComment] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
      const fetchPost = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(
            `${backendUrl}/comments/${postId}/${user?._id}`
          );
          const data = await response.json();
          if (!data.status) {
            toast.error("Failed to fetch post");
            return;
          }

          setPost(data.post);
          setComments(data.comments);
        } catch (error) {
          console.error("Error fetching post:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchPost();
    }, [postId]);

    const handleCommentSubmit = async () => {
      if (!user) {
        toast.error("Please login to comment");
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`${backendUrl}/comment/${postId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            comment,
          }),
        });

        const data = await response.json();

        if (!data.status) {
          toast.error("Failed to add comment");
          return;
        }
        router.refresh();
      } catch (error) {
        console.error("Error adding comment:", error);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="w-full h-screen border-l border-gray-200/20 overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200/20">
          <h2 className="sm:text-lg text-base font-semibold">Post</h2>
        </div>

        {post && <Posts item={post} refresh={true} />}
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="text-white animate-spin" size={24} />
          </div>
        ) : (
          <div className="flex p-4 border-b gap-4 border-gray-200/20">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full p-4 border-b border-gray-200/20 focus:outline-none bg-black/10"
            />
            <button
              onClick={() => handleCommentSubmit()}
              disabled={isLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded-full mt-2">
              Submit
            </button>
          </div>
        )}

        {!isLoading &&
          comments.map((item, index) => (
            <div
              key={index}
              className="flex flex-col border-b border-gray-200/20">
              <Comments item={item} setComments={setComments} />
            </div>
          ))}
      </div>
    );
  };

  const UploadPost = ({}) => {
    const [file, setFile] = React.useState<File | null>(null);
    const [preview, setPreview] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [text, setText] = React.useState("");
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const [communitiesJoined, setCommunitiesJoined] = React.useState<
      {
        _id: string;
        title: string;
      }[]
    >([]);
    const [selectedCommunity, setSelectedCommunity] = React.useState("");
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      const fetchCommunities = async () => {
        if (!user) return;
        try {
          setIsLoading(true);
          const response = await fetch(`${backendUrl}/my-communities`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
          });
          const data = await response.json();
          if (!data.status) {
            toast.error("Failed to fetch communities");
            return;
          }
          setCommunitiesJoined(data.communities);
        } catch (error) {
          console.error("Error fetching communities:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchCommunities();
    }, [user]);

    const handleImageUpload = async (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      const files = e.target.files;
      if (!files || !files[0]) return;

      const selectedFile = files[0];
      setFile(selectedFile);

      // Show preview as base64
      await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
          resolve(true);
        };
        reader.readAsDataURL(selectedFile);
      });
    };

    const handleSubmit = async () => {
      if (!user) {
        toast.error("Please login to upload a post");
        return;
      }

      try {
        setIsLoading(true);
        toast.loading("Uploading post...");
        // Upload to Cloudinary
        let imageUrl = "";

        if (file) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("upload_preset", "default-preset"); // make sure this preset is unsigned

          const uploadResponse = await fetch(
            "https://api.cloudinary.com/v1_1/dz2vnojqy/image/upload",
            {
              method: "POST",
              body: formData,
            }
          );

          const uploadData = await uploadResponse.json();
          imageUrl = uploadData.secure_url;

          const isValidUrlCheck = await fetch(`${backendUrl}/check-url`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
            body: JSON.stringify({ url: imageUrl }),
          });

          const isValidUrl = await isValidUrlCheck.json();

          if (!isValidUrl.status) {
            toast.dismiss();
            toast.error(isValidUrl.message);
            return;
          }
        }

        const response = await fetch(`${backendUrl}/upload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            username: user.name,
            avatar: user.picture,
            post: text,
            image: imageUrl,
            communityId: communitiesJoined.find(
              (item) => item.title === selectedCommunity
            )?._id,
          }),
        });

        const data = await response.json();
        toast.dismiss();
        if (data.status) {
          toast.success("Post uploaded successfully");
          setText("");
          setFile(null);
          setPreview(null);
          router.refresh();
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        console.error("Error uploading image:", error);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="flex flex-col p-2 sm:p-4 border-b border-gray-200/20">
        <div className="flex items-center justify-center gap-4 p-2">
          <img
            src="https://github.com/shadcn.png"
            className="w-10 h-10 rounded-full "
          />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            type="text"
            placeholder="What do you want to share?"
            className="w-3/4 p-4 focus:outline-none bg-black/10 text-white border-b border-gray-200/20 "
          />
        </div>

        {file && (
          <div className="relative w-[80%] m-4 mx-auto">
            <img
              src={preview ?? ""}
              alt="Uploaded"
              className="rounded-lg ml-2 object-cover object-center h-[400px] w-full border-2 border-gray-200/20"
            />

            <button
              onClick={() => {
                setFile(null);
                setPreview(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className="absolute top-2 right-0 p-2 bg-black  rounded-full"
              style={{ boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)" }}>
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between p-2 space-y-3 sm:space-y-0">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-start">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              id="image"
              ref={fileInputRef}
              className="hidden"
            />
            <label
              htmlFor="image"
              className="text-sm flex items-center gap-2 cursor-pointer hover:text-blue-300">
              <FileImage size={20} />
              <span className="whitespace-nowrap">Media</span>
            </label>

            {communitiesJoined.length > 0 && (
              <div className="relative text-sm">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1 hover:text-blue-300">
                  <span className="truncate max-w-[150px]">
                    {selectedCommunity
                      ? selectedCommunity
                      : "Share to Community"}
                  </span>
                  <ChevronDownSquareIcon size={20} />
                </button>
                {isDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-gray-900 rounded-md shadow-lg py-1 z-10">
                    {communitiesJoined.map((community, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedCommunity(community.title);
                          setIsDropdownOpen(false);
                        }}
                        className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-800 truncate">
                        {community.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            className="w-full sm:w-auto bg-white text-black px-6 py-2 rounded-full transition duration-200 hover:bg-gray-200"
            onClick={handleSubmit}
            disabled={isLoading || !text.trim()}>
            {isLoading && (
              <Loader2 className="text-black animate-spin" size={24} />
            )}
            {!isLoading && "Share"}
          </button>
        </div>
      </div>
    );
  };

  const Community = () => {
    const [data, setData] = React.useState<Community[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [filteredData, setFilteredData] = React.useState<Community[]>([]);

    React.useEffect(() => {
      const fetchCommunities = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`${backendUrl}/community`);
          const data = await response.json();
          if (!data.status) {
            toast.error("Failed to fetch communities");
            return;
          }
          setData(data.communities);
        } catch (error) {
          console.error("Error fetching communities:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchCommunities();
    }, []);

    React.useEffect(() => {
      if (search) {
        const filtered = data.filter((item) =>
          item.title.toLowerCase().includes(search.toLowerCase())
        );
        setFilteredData(filtered);
      } else {
        setFilteredData(data);
      }
    }, [search, data]);

    return (
      <div
        className={`${
          isActiveTab !== "community" && "hidden"
        } sm:block absolute sm:relative z-1 bg-black w-full sm:w-1/2 border-l border-gray-200/20`}
        style={{ scrollbarWidth: "thin", scrollbarColor: "#4B5563 #1F2937" }}>
        <div className="p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
            placeholder="Search..."
            className="w-full p-4 border-b border-gray-200/20 focus:outline-none bg-black/10"
          />
        </div>

        <div className="flex flex-col space-y-4 mt-4 overflow-auto h-[calc(100vh-120px)]">
          {filteredData.map((item, index) => (
            <div
              key={index}
              className="flex gap-4 p-4 rounded-lg shadow-md cursor-pointer"
              onClick={() => router.push(`/?community=${item._id}`)}>
              <img
                src={item.image !== "https" ? item.image : ""}
                alt="Profile"
                className="rounded-full w-12 h-12"
              />
              <div>
                <h2 className="text-lg lg:text-lg md:text-base font-semibold">
                  {item.title}
                </h2>
                <p className="text-gray-600 text-sm md:line-clamp-2 lg:line-clamp-none">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
          {filteredData.length === 0 && !isLoading && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No communities found</p>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="text-white animate-spin" size={24} />
            </div>
          )}
        </div>
      </div>
    );
  };

  const Posts = ({
    item,
    refresh,
    setPosts,
  }: {
    item: Post;
    refresh?: boolean;
    setPosts?: React.Dispatch<React.SetStateAction<Post[]>>;
  }) => {
    const [isLoading, setIsLoading] = React.useState(false);

    const handleDeletePost = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${backendUrl}/delete-post/${item._id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
        });
        const data = await response.json();
        if (data.status) {
          toast.success("Post deleted successfully");
          router.refresh();
        } else {
          toast.error("Failed to delete post");
        }
      } catch (error) {
        console.error("Error deleting post:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const handleLikePost = async (e: React.MouseEvent) => {
      try {
        e.stopPropagation();
        e.preventDefault();
        setIsLoading(true);
        if (user === null) {
          toast.error("Please login to like a post");
          return;
        }

        const response = await fetch(`${backendUrl}/like/${item._id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        });
        const data = await response.json();
        if (!data.status) {
          toast.error("Failed to like post");
        }
        if (refresh) return router.refresh();

        setPosts &&
          setPosts((prevPosts) =>
            prevPosts.map((post) =>
              post._id === item._id
                ? {
                    ...post,
                    isLiked: !post.isLiked,
                    like: post.isLiked ? post.like - 1 : post.like + 1,
                  }
                : post
            )
          );
      } catch (error) {
        console.error("Error liking post:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const handleSavePost = async (e: React.MouseEvent) => {
      try {
        e.stopPropagation();
        e.preventDefault();

        if (user === null) {
          toast.error("Please login to save a post");
          return;
        }
        setIsLoading(true);
        const response = await fetch(
          `${backendUrl}/save/${item._id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
          }
        );
        const data = await response.json();
        if (!data.status) {
          toast.error("Failed to save post");
        }
        if (refresh) return router.refresh();
        setPosts &&
          setPosts((prevPosts) =>
            prevPosts.map((post) =>
              post._id === item._id
                ? {
                    ...post,
                    isSaved: !post.isSaved,
                  }
                : post
            )
          );
      } catch (error) {
        console.error("Error saving post:", error);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <React.Fragment>
        <div className="border-b border-gray-200/20 p-4 flex gap-2">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="text-white animate-spin" size={24} />
            </div>
          )}

          <img
            src={item.avatar}
            alt="Avatar"
            className="rounded-full w-10 h-10"
          />
          <div
            className="flex flex-col w-full cursor-pointer"
            onClick={() => router.push(`/?post=${item._id}&comments=true`)}>
            <div className="flex items-center gap-2">
              <h2 className="sm:text-lg text-base font-semibold">
                {item.username}
              </h2>
              <span className="text-gray-500 sm:text-sm text-xs">
                {formattedTime(item.createdAt)}
              </span>
              {item.isEditable && (
                <div className="flex items-center gap-2 ml-auto">
                  <Trash
                    size={16}
                    className="text-red-500 cursor-pointer hover:text-blue-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm("Are you sure you want to delete this post?")
                      ) {
                        handleDeletePost();
                      }
                    }}
                  />
                </div>
              )}
            </div>
            <p className=" text-sm">{item.post}</p>
            {item.image && (
              <div className="flex items-end w-full ">
                <img
                  src={item.image}
                  alt="Post"
                  className="rounded-3xl mt-4 border-2 object-cover border-gray-200/20 w-[90%] mx-auto"
                />
              </div>
            )}
            <div className="flex items-center mt-2">
              <div className="flex justify-around gap-4 w-full">
                <div className="text-gray-500 flex items-center gap-1 cursor-pointer hover:text-blue-300">
                  <MessageCircle size={16} />
                  <span>{item.comment}</span>
                </div>

                <div
                  className={` flex items-center gap-1 cursor-pointer
                  ${
                    item.isLiked
                      ? "text-blue-500"
                      : "hover:text-blue-300 text-gray-500"
                  }
                  `}
                  onClick={handleLikePost}>
                  <Heart size={16} />
                  <span>{item.like}</span>
                </div>

                <Bookmark
                  onClick={handleSavePost}
                  size={20}
                  className={`cursor-pointer hover:text-blue-300 ${
                    item.isSaved ? "text-blue-500" : "text-gray-500"
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  };

  const Notification = () => {
    const [notifications, setNotifications] = React.useState<Notification[]>(
      []
    );
    const [isLoading, setIsLoading] = React.useState(false);
    React.useEffect(() => {
      const fetchNotifications = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`${backendUrl}/notifications`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user?.token}`,
            },
          });
          const data = await response.json();
          if (!data.status) {
            toast.error("Failed to fetch notifications");
            return;
          }
          setNotifications(data.notifications);
        } catch (error) {
          console.error("Error fetching notifications:", error);
        } finally {
          setIsLoading(false);
        }
      };

      if (user) {
        fetchNotifications();
      }
    }, [user]);

    const handleMarkAsRead = async (item: Notification) => {
      try {
        setIsLoading(true);
        const response = await fetch(`${backendUrl}/mark-as-read/${item._id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
        });
        const data = await response.json();
        if (data.status) {
          const isCommunity = item.isCommunity;
          if (isCommunity) {
            router.push(`/?community=${item.community}`);
          } else if (item.postId) {
            router.push(`/?post=${item.postId}&comments=true`);
          } else {
            router.push(`/`);
          }
        } else {
          toast.error("Failed to mark as read");
        }
      } catch (error) {
        console.error("Error marking as read:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const handleMarkAllAsRead = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${backendUrl}/delete-notification/${user?._id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user?.token}`,
            },
          }
        );
        const data = await response.json();
        if (data.status) {
          router.refresh();
        } else {
          toast.error("Failed to mark all as read");
        }
      } catch (error) {
        console.error("Error marking all as read:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (!user)
      return (
        <div className="flex items-center justify-center h-full">
          Please login to view notifications
        </div>
      );

    return (
      <div className="flex flex-col h-full">
        {!isLoading && notifications.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No notifications available</p>
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="text-white animate-spin" size={24} />
          </div>
        ) : (
          <React.Fragment>
            {notifications.length > 0 && (
              <div className="flex items-center justify-between p-4 border-b border-gray-200/20">
                <h2 className="sm:text-lg text-base font-semibold">
                  Notifications
                </h2>
                <button
                  className="text-gray-500 hover:text-blue-300"
                  onClick={handleMarkAllAsRead}
                  disabled={notifications.length === 0}>
                  Mark all as read
                </button>
              </div>
            )}
            <div className="flex flex-col p-2 sm:p-4 overflow-auto h-[calc(100vh-80px)]">
              {notifications.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center p-4 gap-4 cursor-pointer
              ${!item.isRead && "bg-blue-400/20 border border-blue-400/20"}
              `}
                  onClick={() => {
                    handleMarkAsRead(item);
                  }}>
                  <img
                    src={item.avatar || "https://github.com/shadcn.png"}
                    alt="Avatar"
                    className="rounded-full w-10 h-10"
                  />
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <h2 className="sm:text-lg font-semibold line-clamp-1">
                        {item.name}
                      </h2>
                      <span className="text-gray-500 sm:text-sm text-xs text-nowrap">
                        {formattedTime(item.createdAt)}
                      </span>
                    </div>
                    <span className="text-gray-500 text-sm">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </React.Fragment>
        )}
      </div>
    );
  };

  const handleUserLogout = () => {
    googleLogout();
    setUser(null);
    localStorage.removeItem("user");
  };

  const CommunityDetails = () => {
    const [communityDetails, setCommunityDetails] =
      React.useState<Community | null>(null);
    const [posts, setPosts] = React.useState<Post[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [selectedFilter, setSelectedFilter] = React.useState("");

    setIsActiveTab("communityDetails");

    React.useEffect(() => {
      const fetchCommunityDetails = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(
            `${backendUrl}/community/${community}/${user?._id}`
          );
          const data = await response.json();

          if (!data.status) {
            toast.error("Failed to fetch community details");
            return;
          }
          setCommunityDetails(data.community);

          setPosts(data.posts);
        } catch (error) {
          console.error("Error fetching community details:", error);
        } finally {
          setIsLoading(false);
        }
      };

      if (community && community !== "undefined") {
        fetchCommunityDetails();
      }
    }, [community]);

    const handleJoinCommunity = async () => {
      if (!communityDetails) return;
      if (!user) {
        toast.error("Please login to join the community");
        return;
      }
      try {
        toast.loading("Joining community...");
        const response = await fetch(
          `${backendUrl}/join-community/${communityDetails._id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
          }
        );
        const data = await response.json();
        toast.dismiss();
        if (data.status) {
          toast.success("Joined community successfully");
          setCommunityDetails(data.community);
          setPosts(data.posts);
        } else {
          toast.error("Failed to join community");
        }
      } catch (error) {
        console.error("Error joining community:", error);
      }
    };

    const handleLeaveCommunity = async () => {
      if (!communityDetails) return;
      if (!user) {
        toast.error("Please login to leave the community");
        return;
      }
      try {
        toast.loading("Leaving community...");
        const response = await fetch(
          `${backendUrl}/leave-community/${communityDetails._id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
          }
        );
        const data = await response.json();
        toast.dismiss();
        if (data.status) {
          toast.success("Left community successfully");
          setCommunityDetails(data.community);
          setPosts(data.posts);
        } else {
          toast.error("Failed to leave community");
        }
      } catch (error) {
        console.error("Error leaving community:", error);
      }
    };

    const handleFilterChange = (filter: string) => {
      setSelectedFilter(filter);

      let sortedPosts = [...posts];
      switch (filter) {
        case "latest":
          sortedPosts.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          break;
        case "most-liked":
          sortedPosts.sort((a, b) => b.like - a.like);
          break;
        case "most-commented":
          sortedPosts.sort((a, b) => b.comment - a.comment);
          break;
        default:
          break;
      }
      setPosts(sortedPosts);
    };

    const filterButtons = (title: string, filter: string) => {
      return (
        <button
          className={`px-4 py-2 rounded-full border border-gray-200/20 hover:bg-gray-800
            ${selectedFilter === filter ? "bg-gray-800 text-white" : ""}
            `}
          onClick={() => handleFilterChange(filter)}>
          {title}
        </button>
      );
    };
    return (
      <div
        className="flex flex-col h-screen overflow-auto border border-gray-200/20 w-full sm:p-4"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#4B5563 #1F2937" }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="text-white animate-spin" size={24} />
          </div>
        ) : (
          <React.Fragment>
            <div className="relative">
              <div className="sm:h-32 h-24 w-full bg-gray-200/20 sm:rounded-xl"></div>
              <div className="flex flex-col items-start my-8 ml-32">
                <div className="absolute top-16 sm:top-20 left-4 bg-black p-2 rounded-full">
                  <img
                    src={communityDetails?.image}
                    className="rounded-full w-20 h-20"
                  />
                </div>
              </div>
              <div className="mt-16 sm:mt-0 sm:p-2 p-4">
                <h2 className="md:text-4xl text-lg sm:text-xl mx-auto font-semibold capitalize">
                  {communityDetails?.title}
                  <span className="text-gray-500 text-sm">
                    {"  ("}
                    {communityDetails?.members}
                    {(communityDetails?.members ?? 0) > 1
                      ? " Members"
                      : " Member"}
                    {")"}
                  </span>
                </h2>
                <p className="text-gray-500 text-sm mt-2">
                  {communityDetails?.description}
                </p>
              </div>
              <div className="flex gap-4 mt-4 mx-4 text-sm flex-wrap">
                {filterButtons("Latest", "latest")}
                {filterButtons("Most Liked", "most-liked")}
                {filterButtons("Most Commented", "most-commented")}
              </div>
              <div className="border border-gray-200/20 rounded-lg mt-4 mb-6" />
              {!communityDetails?.isMember ? (
                <button
                  className="absolute sm:top-28 top-20 right-4 bg-blue-500 text-white rounded-full py-2 px-4 font-bold hover:bg-blue-600 transition-colors"
                  onClick={handleJoinCommunity}>
                  <span className="hidden md:flex">Join Community</span>
                  <span className="md:hidden flex">
                    <LogIn />
                  </span>
                </button>
              ) : (
                <button
                  className="absolute sm:top-28 top-20 right-4 bg-gray-500 text-white rounded-full py-2 px-4 font-bold hover:bg-gray-600 transition-colors"
                  onClick={handleLeaveCommunity}>
                  <span className="hidden md:flex">Leave Community</span>
                  <span className="md:hidden flex">
                    <LogOut />
                  </span>
                </button>
              )}
            </div>
            {posts.length === 0 && !isLoading && (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No posts available</p>
              </div>
            )}
            {posts.map((item) => (
              <Posts setPosts={setPosts} key={item._id} item={item} />
            ))}
          </React.Fragment>
        )}

        {!community ||
          (community === "undefined" && (
            <div className="flex items-center justify-center h-full">
              No community selected
            </div>
          ))}
        {!communityDetails && !isLoading && (
          <div className="flex items-center justify-center h-full">
            No community found
          </div>
        )}
      </div>
    );
  };

  const Comments = ({
    item,
    setComments,
  }: {
    item: Comment;
    setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  }) => {
    const [isLoading, setIsLoading] = React.useState(false);

    const handleLike = async () => {
      try {
        setIsLoading(true);
        if (user === null) {
          toast.error("Please login to like a comment");
          return;
        }

        const response = await fetch(
          `${backendUrl}/comment-like/${item._id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
          }
        );
        const data = await response.json();
        if (!data.status) {
          toast.error("Failed to like comment");
        }
        setComments((prevComments) =>
          prevComments.map((comment) =>
            comment._id === item._id
              ? {
                  ...comment,
                  isLiked: !comment.isLiked,
                  likes: comment.isLiked
                    ? comment.likes - 1
                    : comment.likes + 1,
                }
              : comment
          )
        );
      } catch (error) {
        console.error("Error liking comment:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const handleDeleteComment = async () => {
      try {
        const response = await fetch(
          `${backendUrl}/delete-comment/${item._id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user?.token}`,
            },
          }
        );
        const data = await response.json();
        if (!data.status) {
          toast.error("Failed to delete comment");
          return;
        }
        setComments((prevComments) =>
          prevComments.filter((comment) => comment._id !== item._id)
        );
        toast.success("Comment deleted successfully");
      } catch (error) {
        console.error("Error deleting comment:", error);
      }
    };

    return (
      <div className="border-b border-gray-200/20 p-4 flex gap-2">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="text-white animate-spin" size={24} />
          </div>
        )}

        <img
          src={item.avatar}
          alt="Avatar"
          className="rounded-full w-10 h-10"
        />
        <div className="flex flex-col w-full">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{item.username}</h2>
            <span className="text-gray-500 text-sm">
              {formattedTime(item.createdAt)}
            </span>
            {item.isEditable && (
              <span className="text-gray-500 text-sm ml-auto">
                <Trash
                  size={16}
                  className="text-red-500 cursor-pointer"
                  onClick={() => {
                    if (
                      confirm("Are you sure you want to delete this comment?")
                    ) {
                      handleDeleteComment();
                    }
                  }}
                />
              </span>
            )}
          </div>
          <p className=" text-sm">{item.comment}</p>
          {item.image && (
            <div className="flex items-end w-full ">
              <img
                src={item.image}
                alt="Post"
                className="rounded-3xl mt-4 border-2 object-cover border-gray-200/20 w-[90%] mx-auto"
              />
            </div>
          )}
          <div
            className={` flex items-center gap-1 cursor-pointer 
              ${
                item.isLiked
                  ? "text-blue-500"
                  : "hover:text-blue-300 text-gray-500"
              }
              `}
            onClick={handleLike}>
            <Heart size={16} />
            <span>{item.likes}</span>
          </div>
        </div>
      </div>
    );
  };

  const Profile = () => {
    const [UserDetails, setUserDetails] = React.useState<User | null>(null);
    const [posts, setPosts] = React.useState<Post[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
      const fetchUserDetails = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`${backendUrl}/user-profile`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user?.token}`,
            },
          });
          const data = await response.json();

          if (!data.status) {
            toast.error("Failed to fetch user details");
            return;
          }
          setUserDetails(data.user);
          setPosts(data.posts);
        } catch (error) {
          console.error("Error fetching user details:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchUserDetails();
    }, [user]);

    return (
      <div
        className="flex flex-col h-screen overflow-auto border border-gray-200/20 w-full sm:p-4"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#4B5563 #1F2937" }}>
        {isLoading && (
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="text-white animate-spin" size={24} />
          </div>
        )}

        {!UserDetails ? (
          <div className="flex items-center justify-center h-full">
            No user found
          </div>
        ) : (
          <React.Fragment>
            <div className="relative">
              <div className="sm:h-32 h-24 w-full bg-gray-200/20 sm:rounded-xl"></div>
              <div className="flex flex-col items-start my-8 ml-32">
                <div className="absolute sm:bottom-12 bottom-10 left-4 bg-black p-2 rounded-full">
                  <img
                    src={UserDetails?.picture}
                    // src="https://github.com/shadcn.png"
                    className="rounded-full w-24 h-24"
                  />
                </div>
                <h2 className="sm:text-3xl text-xl relative sm:left-5 -top-2 font-semibold capitalize">
                  {UserDetails?.name}
                </h2>
              </div>

              <div className="border border-gray-200/20 rounded-lg mt-4 mb-4" />
            </div>
            {posts.length === 0 && !isLoading && (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No posts available</p>
              </div>
            )}
            {posts.map((item, index) => (
              <Posts setPosts={setPosts} key={item._id} item={item} />
            ))}
          </React.Fragment>
        )}
      </div>
    );
  };

  const MobileSideBar = () => {
    const [isLoading, setIsLoading] = React.useState(false);
    const login = useGoogleLogin({
      onSuccess: async (tokenResponse) => {
        try {
          setIsLoading(true);
          // Get user info from Google
          const userInfoResponse = await fetch(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
              headers: {
                Authorization: `Bearer ${tokenResponse.access_token}`,
              },
            }
          );
          const userInfo = await userInfoResponse.json();

          // Login to your backend
          const response = await fetch(`${backendUrl}/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: userInfo.email,
              password: userInfo.sub + userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
            }),
          });
          const data = await response.json();
          if (data.status) {
            setUser(data.user);
          }
        } catch (error) {
          console.error("Error during login:", error);
        } finally {
          setIsLoading(false);
        }
      },
      onError: () => {
        console.error("Login Failed");
        setUser(null);
      },
    });

    return (
      <div className="sm:hidden z-10 absolute bottom-2 w-[90%] left-[5%]  bg-gray-500/20 backdrop-blur-md rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <Home
            size={24}
            className="text-white"
            onClick={() => {
              router.push("/");
              setIsActiveTab("feed");
            }}
          />
          {/* <BellDot
            size={24}
            className="text-white"
            onClick={() => setIsActiveTab("notification")}
          /> */}

          <Users
            onClick={() => setIsActiveTab("community")}
            size={24}
            className="text-white"
          />
          <CircleUser
            size={24}
            className="text-white"
            onClick={() => {
              if (!user) {
                toast.error("Please login to view your profile");
                return;
              }
              setIsActiveTab("profile");
              router.push("/?profile=true");
            }}
          />

          <Bookmark
            size={24}
            className="text-white"
            onClick={() => {
              if (!user) {
                toast.error("Please login to view saved posts");
                return;
              }
              setIsActiveTab("saved");
              router.push("/?saved=true");
            }}
          />

          {!user ? (
            <button
              className=""
              onClick={() => {
                login();
              }}>
              {isLoading ? (
                <Loader2 className="text-white animate-spin" size={24} />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8"
                  viewBox="0 0 48 48">
                  <path
                    fill="#FFC107"
                    d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                  <path
                    fill="#FF3D00"
                    d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                  <path
                    fill="#4CAF50"
                    d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                  <path
                    fill="#1976D2"
                    d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                </svg>
              )}
            </button>
          ) : (
            <LogOut
              size={24}
              className="text-white cursor-pointer"
              onClick={handleUserLogout}
            />
          )}
        </div>
      </div>
    );
  };

  const SavedPost = () => {
    const [posts, setPosts] = React.useState<Post[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
      const fetchUserDetails = async () => {
        try {
          if (!user) return;
          setIsLoading(true);
          const response = await fetch(`${backendUrl}/saved`,{
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
          });
          const data = await response.json();
          if (!data.status) {
            toast.error("Failed to fetch user details");
            return;
          }
          setPosts(data.posts);
        } catch (error) {
          console.error("Error fetching user details:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchUserDetails();
    }, [user]);

    return (
      <div className="flex flex-col h-screen overflow-auto border border-gray-200/20 w-full sm:p-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200/20">
          <h2 className="sm:text-lg text-base font-semibold">Saved Posts</h2>
        </div>
        {isLoading && (
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="text-white animate-spin" size={24} />
          </div>
        )}

        {!user && (
          <div className="flex items-center justify-center h-full">
            Please login to view saved posts
          </div>
        )}

        {posts.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No saved posts available</p>
          </div>
        )}
        {posts.map((item, index) => (
          <Posts setPosts={setPosts} key={item._id} item={item} />
        ))}
      </div>
    );
  };

  return (
    <GoogleOAuthProvider
      clientId={
        "977456214845-phj8buipiqfrv20p89e7h94s0c4u18mq.apps.googleusercontent.com"
      }>
      <main className="flex h-screen items-center justify-between ">
        <Sidebar />
        <MobileSideBar />
        {community ? (
          <CommunityDetails />
        ) : postId && commentOpen ? (
          <PostWithComments />
        ) : profile && user !== null ? (
          <Profile />
        ) : saved && user !== null ? (
          <SavedPost />
        ) : (
          <Feed />
        )}
        <Community />
      </main>
    </GoogleOAuthProvider>
  );
}
