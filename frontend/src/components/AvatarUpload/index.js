/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// components/AvatarUpload/index.js - Versão ajustada
import React, { useContext, useState } from 'react';
import Avatar from '@material-ui/core/Avatar';
import makeStyles from '@material-ui/core/styles/makeStyles';
import Button from '@material-ui/core/Button';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import Box from '@material-ui/core/Box';
import { AuthContext } from '../../context/Auth/AuthContext';
import { getBackendUrl } from '../../config';

const backendUrl = getBackendUrl();

const useStyles = makeStyles((theme) => ({
  avatar: {
    width: theme.spacing(12),
    height: theme.spacing(12),
    margin: theme.spacing(2),
    cursor: 'pointer',
    borderRadius: '50%',
    border: '2px solid #ccc',
  },
}));

const AvatarUploader = ({ setAvatar, avatar, companyId }) => {
  const classes = useStyles();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const { user } = useContext(AuthContext);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Formato de arquivo não suportado. Use apenas JPG, PNG, GIF ou WebP.');
      return;
    }

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('Arquivo muito grande. Tamanho máximo: 5MB');
      return;
    }

    setSelectedFile(file);
    setAvatar(file);

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Função para determinar qual imagem exibir
  const getImageSrc = () => {
    if (previewImage) return previewImage;
    if (avatar && companyId) return `${backendUrl}/public/company${companyId}/user/${avatar}`;
    return `${backendUrl}/public/app/noimage.png`;
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <Avatar
        alt="User Avatar"
        src={getImageSrc()}
        style={{ width: 120, height: 120, cursor: 'pointer' }}
        onClick={() => document.getElementById('avatar-upload').click()}
        onError={(e) => {
          // Fallback para imagem padrão em caso de erro
          e.target.src = `${backendUrl}/public/app/noimage.png`;
        }}
      />

      <input
        accept="image/*"
        type="file"
        id="avatar-upload"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <label htmlFor="avatar-upload" style={{ marginTop: 10 }}>
        <Button
          variant="contained"
          component="span"
          startIcon={<CloudUploadIcon />}
        >
          {avatar ? 'Alterar Avatar' : 'Upload Avatar'}
        </Button>
      </label>
    </Box>
  );
};

export default AvatarUploader;