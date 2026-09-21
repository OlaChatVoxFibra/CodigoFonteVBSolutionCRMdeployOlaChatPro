/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useState, useEffect } from "react";
import toastError from "../../errors/toastError";
import filesService from "../../services/filesService";

const useFiles = ({ searchParam, pageNumber }) => {
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [files, setFiles] = useState([]);
    const [count, setCount] = useState(0);

    useEffect(() => {
        setLoading(true);
        const delayDebounceFn = setTimeout(() => {
            const fetchFiles = async () => {
                try {
                    const data = await filesService.list({
                        searchParam,
                        pageNumber,
                    });
                    setFiles(data.files || []);
                    setHasMore(data.hasMore);
                    setCount(data.count);
                    setLoading(false);
                } catch (err) {
                    setLoading(false);
                    toastError(err);
                }
            };

            fetchFiles();
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchParam, pageNumber]);

    return { files, loading, hasMore, count };
};

export default useFiles;
