/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
} from "@material-ui/core";
import {
  Description,
  GetApp,
  OpenInNew,
  Close,
  PictureAsPdf,
  Image,
  VideoLibrary,
  Audiotrack,
  Archive,
  Code,
  TableChart,
  Slideshow,
} from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiDialog-paper": {
      minWidth: 400,
      maxWidth: 600,
    },
  },
  documentInfo: {
    display: "flex",
    alignItems: "center",
    marginBottom: theme.spacing(2),
  },
  documentIcon: {
    fontSize: 48,
    marginRight: theme.spacing(2),
    color: theme.palette.primary.main,
  },
  documentDetails: {
    flex: 1,
  },
  documentName: {
    fontWeight: "bold",
    marginBottom: theme.spacing(1),
  },
  documentType: {
    marginBottom: theme.spacing(1),
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.spacing(2),
  },
  downloadButton: {
    marginRight: theme.spacing(1),
  },
  closeButton: {
    position: "absolute",
    right: theme.spacing(1),
    top: theme.spacing(1),
  },
}));

const DocumentModal = ({ open, onClose, document }) => {
  const classes = useStyles();
  const [fileInfo, setFileInfo] = useState(null);

  useEffect(() => {
    if (document && document.mediaPath) {
      // Extrair informações do arquivo
      const fileName =
        document.mediaName || document.mediaPath.split("/").pop();
      const fileExtension = fileName.split(".").pop()?.toLowerCase();

      setFileInfo({
        name: fileName,
        extension: fileExtension,
        type: document.mediaType,
        url: document.mediaPath,
      });
    }
  }, [document]);

  const getDocumentIcon = (extension, mediaType) => {
    switch (extension) {
      case "pdf":
        return <PictureAsPdf className={classes.documentIcon} />;
      case "doc":
      case "docx":
      case "odt":
        return <Description className={classes.documentIcon} />;
      case "xls":
      case "xlsx":
      case "ods":
        return <TableChart className={classes.documentIcon} />;
      case "ppt":
      case "pptx":
      case "odp":
        return <Slideshow className={classes.documentIcon} />;
      case "zip":
      case "rar":
      case "7z":
      case "tar":
      case "gz":
      case "bz2":
        return <Archive className={classes.documentIcon} />;
      case "exe":
        return <GetApp className={classes.documentIcon} />;
      case "xml":
      case "json":
      case "html":
        return <Code className={classes.documentIcon} />;
      case "ret":
        return <Description className={classes.documentIcon} />;
      default:
        if (mediaType === "image")
          return <Image className={classes.documentIcon} />;
        if (mediaType === "video")
          return <VideoLibrary className={classes.documentIcon} />;
        if (mediaType === "audio")
          return <Audiotrack className={classes.documentIcon} />;
        return <Description className={classes.documentIcon} />;
    }
  };

  const getDocumentTypeName = (extension) => {
    const typeMap = {
      pdf: "Documento PDF",
      doc: "Documento Word",
      docx: "Documento Word",
      odt: "Documento OpenDocument",
      xls: "Planilha Excel",
      xlsx: "Planilha Excel",
      ods: "Planilha OpenDocument",
      ppt: "Apresentação PowerPoint",
      pptx: "Apresentação PowerPoint",
      odp: "Apresentação OpenDocument",
      zip: "Arquivo Compactado",
      rar: "Arquivo Compactado",
      "7z": "Arquivo Compactado",
      tar: "Arquivo Compactado",
      gz: "Arquivo Compactado",
      bz2: "Arquivo Compactado",
      xml: "Arquivo XML",
      json: "Arquivo JSON",
      html: "Arquivo HTML",
      ofx: "Arquivo OFX",
      msg: "E-mail Outlook",
      key: "Apresentação Keynote",
      numbers: "Planilha Numbers",
      pages: "Documento Pages",
      exe: "Executável",
      ret: "Arquivo RET",
    };

    return typeMap[extension] || "Documento";
  };

  const handleDownload = () => {
    if (fileInfo?.url) {
      window.open(fileInfo.url, "_blank");
    }
  };

  const handleOpen = () => {
    if (fileInfo?.url) {
      window.open(fileInfo.url, "_blank");
    }
  };

  if (!fileInfo) return null;

  return (
    <Dialog open={open} onClose={onClose} className={classes.root}>
      <DialogTitle>
        Visualizar Documento
        <IconButton className={classes.closeButton} onClick={onClose}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box className={classes.documentInfo}>
          {["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(
            fileInfo.extension
          ) ? (
            <img
              src={fileInfo.url}
              alt={fileInfo.name}
              style={{ maxWidth: "100%", maxHeight: 300, marginBottom: 16 }}
            />
          ) : (
            getDocumentIcon(fileInfo.extension, fileInfo.type)
          )}
          <Box className={classes.documentDetails}>
            <Typography className={classes.documentName} variant="h6">
              {fileInfo.name}
            </Typography>
            <Typography
              className={classes.documentType}
              variant="body2"
              color="textSecondary"
            >
              {getDocumentTypeName(fileInfo.extension)}
            </Typography>
            <Chip
              label={fileInfo.extension.toUpperCase()}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions className={classes.actions}>
        <Box>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<OpenInNew />}
            onClick={handleOpen}
            className={classes.downloadButton}
          >
            Abrir
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<GetApp />}
            onClick={handleDownload}
          >
            Download
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentModal;
