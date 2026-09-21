/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useState, useEffect } from "react";
import toastError from "../errors/toastError";
import projectsService from "../services/projectsService";

const useProjects = ({ searchParam, pageNumber }) => {
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [projects, setProjects] = useState([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchProjects = async () => {
        try {
          const { projects: data, hasMore: more, count: total } = await projectsService.getProjects({
            searchParam,
            pageNumber,
          });
          setProjects(data);
          setHasMore(more);
          setCount(total);
          setLoading(false);
        } catch (err) {
          setLoading(false);
          toastError(err);
        }
      };
      fetchProjects();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  return { projects, loading, hasMore, count };
};

export default useProjects;
