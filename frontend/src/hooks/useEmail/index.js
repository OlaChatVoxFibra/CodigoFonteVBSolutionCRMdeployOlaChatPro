/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useState, useEffect } from "react";
import toastError from "../../errors/toastError";
import emailService from "../../services/emailService";

const useEmail = ({ searchParam, pageNumber }) => {
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [emails, setEmails] = useState([]);
    const [count, setCount] = useState(0);

    useEffect(() => {
        let timeout;
        const run = async () => {
            setLoading(true);
            try {
                const data = await emailService.list({
                    searchParam,
                    pageNumber,
                });
                setEmails(data.emails || []);
                setHasMore(data.hasMore);
                setCount(data.count);
                setLoading(false);
            } catch (err) {
                setLoading(false);
                toastError(err);
            }
        };
        const shouldDebounce = typeof searchParam === "string" && searchParam.trim().length > 0;
        if (shouldDebounce) {
            timeout = setTimeout(run, 300);
        } else {
            run();
        }
        return () => timeout && clearTimeout(timeout);
    }, [searchParam, pageNumber]);

    return { emails, loading, hasMore, count };
};

export default useEmail;
