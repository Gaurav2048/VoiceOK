import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApi } from "./hooks/useApi";
import { SERVICES } from "./constant";


type RedirectApiResponse = {
    token: string
    message: string
}

const GoogleCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const iss = searchParams.get('iss') || '';
  const code = searchParams.get('code') || '';
  const scope = searchParams.get('scope') || '';
  const prompt = searchParams.get('prompt') || '';

  const navigate = useNavigate();

  const {
    data,
    execute,
  } = useApi<RedirectApiResponse>(SERVICES.GOOGLE_REDIRECT, { method: 'GET' })

  useEffect(() => {
    if (code && scope && prompt && iss) {
        alert(`Received Google callback with code: ${code}, scope: ${scope}, prompt: ${prompt}, iss: ${iss}`);
        execute({
            params: {
              iss, code, scope, prompt
            }
        })
    
    }
  }, [iss, code, scope, prompt]);

  useEffect(() => {
    if (data && data.token) {
        localStorage.setItem('token', data.token);
        navigate("/");
    }
  }, [data]);

  return <div className="dialtone-app">
    
  </div>
};

export default GoogleCallback;