import { axiosInstance } from "@/lib/axios";
import { Loader } from "lucide-react";
import { useState, useEffect } from "react";


const updateApiToken = (token: string | null) => {
    if(token) {
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
    else {
        delete axiosInstance.defaults.headers.common['Authorization'];
    }
}

const AuthProvider = ({ children }: {children: React.ReactNode}) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async() => {
            try {
                const token = localStorage.getItem('token');
                updateApiToken(token);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }

        initAuth();       
    }, [])
    
    
    if(loading) {
        return <div className="h-screen w-full flex items-center justify-center">
            <Loader className="animate-spin size-8 text-red-300" />
        </div>    
    }

    return (
        <>{children}</>
    )
};

export default AuthProvider;