/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useState, useEffect } from "react";
import toastError from "../../errors/toastError";

import api from "../../services/api";

const useMessages = ({ fromMe, dateStart, dateEnd, ticketUserId, ticketUserIds }) => {
    const [loading, setLoading] = useState(true);
    const [count, setCount] = useState(0);

    useEffect(() => {
        setLoading(true);
        const delayDebounceFn = setTimeout(() => {
            const fetchMessages = async () => {
                try {
                    const params = {
                        fromMe,
                        dateStart,
                        dateEnd,
                    };
                    if (ticketUserIds != null && ticketUserIds.length > 0) {
                        params.ticketUserIds = ticketUserIds.join(",");
                    } else if (ticketUserId != null && ticketUserId !== "") {
                        params.ticketUserId = ticketUserId;
                    }
                    const { data } = await api.get("/messages-allMe", {
                        params,
                    });
                    setCount(data.count[0].count);
                    setLoading(false);
                } catch (err) {
                    setLoading(false);
                    toastError(err);
                }
            };

            fetchMessages();
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [dateStart, dateEnd, ticketUserId, ticketUserIds, fromMe]);

    return { count };
};

export default useMessages;
