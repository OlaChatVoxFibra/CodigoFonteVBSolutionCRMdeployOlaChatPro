/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useState, useEffect } from "react";
import toastError from "../../errors/toastError";
import activitiesService from "../../services/activitiesService";

const useActivities = ({ searchParam, pageNumber, date, dateStart, dateEnd, refreshSignal = 0 }) => {
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [activities, setActivities] = useState([]);
    const [count, setCount] = useState(0);

    useEffect(() => {
        setLoading(true);
        const delayDebounceFn = setTimeout(() => {
            const fetchActivities = async () => {
                try {
                    const data = await activitiesService.list({
                        searchParam,
                        pageNumber,
                        date,
                        dateStart,
                        dateEnd,
                    });
                    setActivities(data.activities || []);
                    setHasMore(data.hasMore);
                    setCount(data.count);
                    setLoading(false);
                } catch (err) {
                    setLoading(false);
                    toastError(err);
                }
            };

            fetchActivities();
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchParam, pageNumber, date, dateStart, dateEnd, refreshSignal]);

    return { activities, loading, hasMore, count };
};

export default useActivities;
