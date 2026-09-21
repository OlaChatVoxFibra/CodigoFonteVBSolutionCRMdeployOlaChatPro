/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
    ArrowForwardIos,
    ContentCopy,
    Delete,
    RemoveCircle,
    Tag,
  } from "@mui/icons-material";
  import React, { memo } from "react";
  import { useNodeStorage } from "../../../stores/useNodeStorage";
  import { Handle } from "react-flow-renderer";
  
  export default memo(({ data, isConnectable, id }) => {
    const storageItems = useNodeStorage();
    
    return (
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "8px",
          borderRadius: "8px",
          boxShadow: "rgba(0, 0, 0, 0.05) 0px 3px 5px",
          border: "1px solid rgba(220, 53, 69, 0.25)",
        }}
      >
        <Handle
          type="target"
          position="left"
          style={{
            background: "#dc3545",
            width: "18px",
            height: "18px",
            top: "20px",
            left: "-12px",
            cursor: "pointer",
          }}
          onConnect={(params) => console.log("handle onConnect", params)}
          isConnectable={isConnectable}
        >
          <ArrowForwardIos
            sx={{
              color: "#ffff",
              width: "10px",
              height: "10px",
              marginLeft: "2.9px",
              marginBottom: "1px",
              pointerEvents: "none",
            }}
          />
        </Handle>
        
        <div
          style={{
            display: "flex",
            position: "absolute",
            right: 5,
            top: 5,
            cursor: "pointer",
            gap: 6,
          }}
        >
          <ContentCopy
            onClick={() => {
              storageItems.setNodesStorage(id);
              storageItems.setAct("duplicate");
            }}
            sx={{ width: "12px", height: "12px", color: "#F7953B" }}
          />
  
          <Delete
            onClick={() => {
              storageItems.setNodesStorage(id);
              storageItems.setAct("delete");
            }}
            sx={{ width: "12px", height: "12px", color: "#F7953B" }}
          />
        </div>
        
        <div
          style={{
            color: "#ededed",
            fontSize: "16px",
            flexDirection: "row",
            display: "flex",
          }}
        >
          <RemoveCircle
            sx={{
              width: "16px",
              height: "16px",
              marginRight: "4px",
              marginTop: "4px",
              color: "#dc3545",
            }}
          />
          <div style={{ color: "#232323", fontSize: "16px" }}>Remover Tag</div>
        </div>
        
        <div style={{ color: "#232323", fontSize: "12px", width: 180 }}>
          <div
            style={{
              backgroundColor: "#FFF5F5",
              marginBottom: "3px",
              borderRadius: "5px",
              padding: "8px",
            }}
          >
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "4px",
              color: "#dc3545" 
            }}>
              <Tag sx={{ width: "14px", height: "14px" }} />
              <span style={{ fontSize: "11px", fontWeight: "500" }}>
                {data?.tag?.name || "Tag não selecionada"}
              </span>
            </div>
            {data?.tag?.name && (
              <div style={{ 
                fontSize: "10px", 
                color: "#666", 
                marginTop: "2px",
                fontStyle: "italic"
              }}>
                Remove a tag do contato
              </div>
            )}
          </div>
        </div>
  
        <Handle
          type="source"
          position="right"
          style={{
            background: "#dc3545",
            width: "18px",
            height: "18px",
            top: "20px",
            right: "-12px",
            cursor: "pointer",
          }}
          isConnectable={isConnectable}
        >
          <ArrowForwardIos
            sx={{
              color: "#ffff",
              width: "10px",
              height: "10px",
              marginLeft: "2.9px",
              marginBottom: "1px",
              pointerEvents: "none",
            }}
          />
        </Handle>
      </div>
    );
  });