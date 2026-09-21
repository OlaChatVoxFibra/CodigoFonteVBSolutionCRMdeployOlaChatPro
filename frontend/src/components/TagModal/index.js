/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useContext } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import { Colorize } from "@material-ui/icons";
import { ColorBox } from 'material-ui-color';

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { FormControl, IconButton, InputAdornment, InputLabel, MenuItem, Select, Box, Typography, Chip } from "@material-ui/core";
import { Grid } from "@material-ui/core";
import { AttachFile, Delete, CloudUpload } from "@material-ui/icons";

const useStyles = makeStyles(theme => ({
	root: {
		display: "flex",
		flexWrap: "wrap",
	},
	multFieldLine: {
		display: "flex",
		"& > *:not(:last-child)": {
			marginRight: theme.spacing(1),
		},
	},

	btnWrapper: {
		position: "relative",
	},

	buttonProgress: {
		color: green[500],
		position: "absolute",
		top: "50%",
		left: "50%",
		marginTop: -12,
		marginLeft: -12,
	},
	formControl: {
		margin: theme.spacing(1),
		minWidth: 120,
	},
	colorAdorment: {
		width: 20,
		height: 20,
	},
	mediaUpload: {
		border: `2px dashed ${theme.palette.grey[300]}`,
		borderRadius: theme.shape.borderRadius,
		padding: theme.spacing(2),
		textAlign: 'center',
		cursor: 'pointer',
		transition: 'border-color 0.3s',
		'&:hover': {
			borderColor: theme.palette.primary.main,
		},
	},
	mediaPreview: {
		marginTop: theme.spacing(1),
		display: 'flex',
		flexWrap: 'wrap',
		gap: theme.spacing(1),
	},
	mediaItem: {
		position: 'relative',
		display: 'inline-block',
	},
	mediaThumbnail: {
		width: 60,
		height: 60,
		objectFit: 'cover',
		borderRadius: theme.shape.borderRadius,
	},
	removeButton: {
		position: 'absolute',
		top: -8,
		right: -8,
		backgroundColor: theme.palette.error.main,
		color: 'white',
		width: 20,
		height: 20,
		minWidth: 'auto',
		'&:hover': {
			backgroundColor: theme.palette.error.dark,
		},
	},
}));

const TagSchema = Yup.object().shape({
	name: Yup.string()
		.min(3, "Mensagem muito curta")
		.required("Obrigatório")
});

const TagModal = ({ open, onClose, tagId, kanban }) => {
	const classes = useStyles();
	const { user } = useContext(AuthContext);
	const [colorPickerModalOpen, setColorPickerModalOpen] = useState(false);
	const [lanes, setLanes] = useState([]);
	const [loading, setLoading] = useState(false);
	const [selectedLane, setSelectedLane] = useState(null);
	const [selectedRollbackLane, setSelectedRollbackLane] = useState(null);

	const initialState = {
		name: "",
		color: getRandomHexColor(),
		kanban: kanban || 0,
		timeLane: 0,
		nextLaneId: 0,
		greetingMessageLane: "",
		rollbackLaneId: 0,
		mediaFiles: [],
	};

	const [formData, setFormData] = useState(initialState);

	useEffect(() => {
		const fetchLanes = async () => {
			try {
				const { data } = await api.get("/tags/", {
					params: { kanban: 1, tagId },
				});
				setLanes(data.tags);
				setLoading(false);
			} catch (err) {
				toastError(err);
				setLoading(false);
			}
		};

		if (open) {
			setLoading(true);
			fetchLanes();
		}
	}, [open, tagId]);

	useEffect(() => {
		const fetchTag = async () => {
			try {
				const { data } = await api.get(`/tags/${tagId}`);
				if (data) {
					// Parsear mediaFiles se for uma string JSON
					let parsedMediaFiles = [];
					if (data.mediaFiles) {
						try {
							parsedMediaFiles = typeof data.mediaFiles === 'string' 
								? JSON.parse(data.mediaFiles) 
								: data.mediaFiles;
							
							// Garantir que os arquivos do backend tenham as propriedades corretas
							parsedMediaFiles = parsedMediaFiles.map(file => ({
								...file,
								// Se for arquivo do backend, mapear mimetype para type
								type: file.mimetype || file.type,
								// Garantir que name existe
								name: file.originalname || file.name || 'Arquivo sem nome'
							}));
						} catch (e) {
							console.log('Erro ao parsear mediaFiles:', e);
							parsedMediaFiles = [];
						}
					}
					
					setFormData(prev => ({ 
						...initialState, 
						...data, 
						mediaFiles: parsedMediaFiles 
					}));
					setSelectedLane(data.nextLaneId || null);
					setSelectedRollbackLane(data.rollbackLaneId || null);
				}
			} catch (err) {
				toastError(err);
			}
		};

		if (open && tagId) {
			fetchTag();
		} else if (open) {
			setFormData(initialState);
			setSelectedLane(null);
			setSelectedRollbackLane(null);
		}
	}, [tagId, open]);

	const handleClose = () => {
		setFormData(initialState);
		setColorPickerModalOpen(false);
		setSelectedLane(null);
		setSelectedRollbackLane(null);
		onClose();
	};

	const handleFileUpload = (event) => {
		const files = Array.from(event.target.files);
		const validFiles = files.filter(file => {
			const maxSize = 10 * 1024 * 1024; // 10MB
			const allowedTypes = [
				'image/jpeg', 'image/png', 'image/gif', 'image/webp',
				'application/pdf',
				'audio/mpeg', 'audio/wav', 'audio/ogg',
				'video/mp4', 'video/avi', 'video/mov', 'video/webm',
				'application/x-ret'
			];
			
			if (file.size > maxSize) {
				toast.error(`Arquivo ${file.name} é muito grande. Tamanho máximo: 10MB`);
				return false;
			}
			
			if (!allowedTypes.includes(file.type)) {
				toast.error(`Tipo de arquivo ${file.type} não é suportado`);
				return false;
			}
			
			return true;
		});

		if (validFiles.length > 0) {
			setFormData(prev => ({
				...prev,
				mediaFiles: [...(Array.isArray(prev.mediaFiles) ? prev.mediaFiles : []), ...validFiles]
			}));
		}
	};

	const handleRemoveFile = (index) => {
		setFormData(prev => ({
			...prev,
			mediaFiles: (Array.isArray(prev.mediaFiles) ? prev.mediaFiles : []).filter((_, i) => i !== index)
		}));
	};

	const getFileIcon = (file) => {
		// Verificar se é um arquivo do backend (tem mimetype) ou do frontend (tem type)
		const fileType = file.mimetype || file.type;
		if (!fileType) return '📎';
		
		if (fileType.startsWith('image/')) return '🖼️';
		if (fileType === 'application/pdf') return '📄';
		if (fileType === 'application/x-ret') return '📄';
		if (fileType.startsWith('audio/')) return '🎵';
		if (fileType.startsWith('video/')) return '🎥';
		return '📎';
	};

	const formatFileSize = (bytes) => {
		if (!bytes || bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	};

	const handleSaveTag = async values => {
		const formData = new FormData();
		
		// Adicionar campos básicos
		formData.append('name', values.name);
		formData.append('color', values.color);
		formData.append('kanban', kanban);
		formData.append('timeLane', values.timeLane || 0);
		formData.append('nextLaneId', selectedLane || 0);
		formData.append('greetingMessageLane', values.greetingMessageLane || '');
		formData.append('rollbackLaneId', selectedRollbackLane || 0);
		
		// Adicionar arquivos de mídia
		if (values.mediaFiles && Array.isArray(values.mediaFiles) && values.mediaFiles.length > 0) {
			values.mediaFiles.forEach((file, index) => {
				formData.append(`mediaFiles`, file);
			});
		}

		try {
			if (tagId) {
				await api.put(`/tags/${tagId}`, formData, {
					headers: {
						'Content-Type': 'multipart/form-data',
					},
				});
			} else {
				await api.post("/tags", formData, {
					headers: {
						'Content-Type': 'multipart/form-data',
					},
				});
			}
			toast.success(kanban === 0 ? i18n.t("tagModal.success") : i18n.t("tagModal.successKanban"));
			handleClose();
		} catch (err) {
			toastError(err);
		}
	};

	function getRandomHexColor() {
		// Gerar valores aleatórios para os componentes de cor
		const red = Math.floor(Math.random() * 256); // Valor entre 0 e 255
		const green = Math.floor(Math.random() * 256); // Valor entre 0 e 255
		const blue = Math.floor(Math.random() * 256); // Valor entre 0 e 255

		// Converter os componentes de cor em uma cor hexadecimal
		const hexColor = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;

		return hexColor;
	}

	return (
		<div className={classes.root}>
			<Dialog
				open={open}
				onClose={handleClose}
				maxWidth="md"
				fullWidth
				scroll="paper"
			>
				<DialogTitle>
					{tagId 
						? kanban === 0 
							? i18n.t("tagModal.title.edit")
							: i18n.t("tagModal.title.editKanban")
						: kanban === 0
							? i18n.t("tagModal.title.add")
							: i18n.t("tagModal.title.addKanban")
					}
				</DialogTitle>
				<Formik
					initialValues={formData}
					enableReinitialize={true}
					validationSchema={TagSchema}
					onSubmit={handleSaveTag}
				>
					{({ touched, errors, isSubmitting, values, handleChange }) => (
						<Form>
							<DialogContent dividers>
								<Grid container spacing={1}>
									<Grid item xs={12}>
										<Field
											as={TextField}
											label={i18n.t("tagModal.form.name")}
											name="name"
											fullWidth
											error={touched.name && Boolean(errors.name)}
											helperText={touched.name && errors.name}
											variant="outlined"
											margin="dense"
											autoFocus
										/>
									</Grid>
									<Grid item xs={12}>
										<Field
											as={TextField}
											label={i18n.t("tagModal.form.color")}
											name="color"
											fullWidth
											variant="outlined"
											margin="dense"
											InputProps={{
												startAdornment: (
													<InputAdornment position="start">
														<div
															style={{ backgroundColor: values.color }}
															className={classes.colorAdorment}
														/>
													</InputAdornment>
												),
												endAdornment: (
													<IconButton
														onClick={() => setColorPickerModalOpen(!colorPickerModalOpen)}
													>
														<Colorize />
													</IconButton>
												),
											}}
										/>
										{colorPickerModalOpen && (
											<ColorBox
												disableAlpha
												hslGradient={false}
												style={{ margin: '20px auto 0' }}
												value={values.color}
												onChange={val => {
													handleChange({
														target: {
															name: 'color',
															value: `#${val.hex}`
														}
													});
												}}
											/>
										)}
									</Grid>

									{kanban === 1 && (
										<>
											<Grid item xs={12} md={6}>
												<Field
													as={TextField}
													label={i18n.t("tagModal.form.timeLane")}
													name="timeLane"
													fullWidth
													variant="outlined"
													margin="dense"
													type="number"
												/>
											</Grid>
											<Grid item xs={12} md={6}>
												<FormControl
													variant="outlined"
													margin="dense"
													fullWidth
												>
													<InputLabel>
														{i18n.t("tagModal.form.nextLaneId")}
													</InputLabel>
													<Select
														value={selectedLane || ''}
														onChange={(e) => setSelectedLane(e.target.value)}
														label={i18n.t("tagModal.form.nextLaneId")}
													>
														<MenuItem value="">&nbsp;</MenuItem>
														{lanes && lanes.length > 0 && lanes.map((lane) => (
															<MenuItem key={lane.id} value={lane.id}>
																{lane.name}
															</MenuItem>
														))}
													</Select>
												</FormControl>
											</Grid>
											<Grid item xs={12}>
												<Field
													as={TextField}
													label={i18n.t("tagModal.form.greetingMessageLane")}
													name="greetingMessageLane"
													fullWidth
													multiline
													rows={4}
													variant="outlined"
													margin="dense"
												/>
											</Grid>
											<Grid item xs={12}>
												<Typography variant="subtitle2" gutterBottom>
													{i18n.t("tagModal.form.mediaFiles")}
												</Typography>
                                                <Box
                                                    className={classes.mediaUpload}
                                                    onClick={() => document.getElementById('media-upload').click()}
                                                >
													<CloudUpload style={{ fontSize: 40, color: '#666' }} />
													<Typography variant="body2" color="textSecondary">
														Clique para anexar mídia (Imagem, PDF, Áudio, Vídeo)
													</Typography>
													<Typography variant="caption" color="textSecondary">
														Tamanho máximo: 10MB por arquivo
													</Typography>
													<input
														id="media-upload"
														type="file"
														multiple
														accept="image/*,application/pdf,audio/*,video/*"
                                                        onChange={e => {
                                                            const files = Array.from(e.target.files || []);
                                                            const maxSize = 10 * 1024 * 1024; // 10MB
                                                            const allowedTypes = [
                                                                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                                                                'application/pdf',
                                                                'audio/mpeg', 'audio/wav', 'audio/ogg',
                                                                'video/mp4', 'video/avi', 'video/mov', 'video/webm'
                                                            ];
                                                            const validFiles = files.filter(file => {
                                                                if (file.size > maxSize) {
                                                                    toast.error(`Arquivo ${file.name} é muito grande. Tamanho máximo: 10MB`);
                                                                    return false;
                                                                }
                                                                if (!allowedTypes.includes(file.type)) {
                                                                    toast.error(`Tipo de arquivo ${file.type} não é suportado`);
                                                                    return false;
                                                                }
                                                                return true;
                                                            });
                                                            if (validFiles.length > 0) {
                                                                const current = Array.isArray(values.mediaFiles) ? values.mediaFiles : [];
                                                                const next = [...current, ...validFiles];
                                                                // Update Formik state to avoid reinitializing the whole form
                                                                // and losing typed fields
                                                                // Also reset input to allow selecting the same file again
                                                                e.target.value = null;
                                                                return handleChange({ target: { name: 'mediaFiles', value: next } });
                                                            }
                                                            e.target.value = null;
                                                        }}
														style={{ display: 'none' }}
													/>
												</Box>
                                                {values.mediaFiles && Array.isArray(values.mediaFiles) && values.mediaFiles.length > 0 && (
													<Box className={classes.mediaPreview}>
                                                        {values.mediaFiles.map((file, index) => (
															<Box key={index} className={classes.mediaItem}>
																<Chip
																	icon={<AttachFile />}
																	label={`${getFileIcon(file)} ${file.originalname || file.name} (${formatFileSize(file.size)})`}
                                                                    onDelete={() => {
                                                                        const current = Array.isArray(values.mediaFiles) ? values.mediaFiles : [];
                                                                        const next = current.filter((_, i) => i !== index);
                                                                        handleChange({ target: { name: 'mediaFiles', value: next } });
                                                                    }}
																	variant="outlined"
																	size="small"
																/>
															</Box>
														))}
													</Box>
												)}
											</Grid>
											<Grid item xs={12}>
												<FormControl
													variant="outlined"
													margin="dense"
													fullWidth
												>
													<InputLabel>
														{i18n.t("tagModal.form.rollbackLaneId")}
													</InputLabel>
													<Select
														value={selectedRollbackLane || ''}
														onChange={(e) => setSelectedRollbackLane(e.target.value)}
														label={i18n.t("tagModal.form.rollbackLaneId")}
													>
														<MenuItem value="">&nbsp;</MenuItem>
														{lanes && lanes.length > 0 && lanes.map((lane) => (
															<MenuItem key={lane.id} value={lane.id}>
																{lane.name}
															</MenuItem>
														))}
													</Select>
												</FormControl>
											</Grid>
										</>
									)}
								</Grid>
							</DialogContent>
							<DialogActions>
								<Button
									onClick={handleClose}
									color="secondary"
									disabled={isSubmitting}
									variant="outlined"
								>
									{i18n.t("tagModal.buttons.cancel")}
								</Button>
								<Button
									type="submit"
									color="primary"
									disabled={isSubmitting}
									variant="contained"
									className={classes.btnWrapper}
								>
									{tagId
										? i18n.t("tagModal.buttons.okEdit")
										: i18n.t("tagModal.buttons.okAdd")}
									{isSubmitting && (
										<CircularProgress
											size={24}
											className={classes.buttonProgress}
										/>
									)}
								</Button>
							</DialogActions>
						</Form>
					)}
				</Formik>
			</Dialog>
		</div>
	);
};

export default TagModal;
