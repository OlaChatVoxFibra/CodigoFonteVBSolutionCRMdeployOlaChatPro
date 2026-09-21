/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useState, useEffect } from "react";
import toastError from "../../errors/toastError";
import inventoryService from "../../services/inventoryService";

const useInventory = ({ searchParam, pageNumber, refreshSignal = 0 }) => {
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [inventory, setInventory] = useState([]);
    const [count, setCount] = useState(0);

    useEffect(() => {
        let mounted = true;
        const fetchInventory = async () => {
            try {
                setLoading(true);
                const data = await inventoryService.list({
                    searchParam,
                    pageNumber,
                });
                if (!mounted) return;
                setInventory(data.inventory || []);
                setHasMore(!!data.hasMore);
                setCount(data.count || 0);
            } catch (err) {
                if (mounted) toastError(err);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchInventory();
        return () => { mounted = false; };
    }, [searchParam, pageNumber, refreshSignal]);

    return { inventory, loading, hasMore, count };
};

export default useInventory;
