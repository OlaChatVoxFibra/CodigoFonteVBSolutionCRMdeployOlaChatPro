/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useRef, useContext } from "react";
import { parseISO, format } from "date-fns";
import * as Yup from "yup";
import { Formik, FieldArray, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles, useTheme } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Drawer from "@material-ui/core/Drawer";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import Box from "@material-ui/core/Box";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import CircularProgress from "@material-ui/core/CircularProgress";
import Switch from "@material-ui/core/Switch";
import CloseIcon from "@material-ui/icons/Close";
import {
	PersonOutline as PersonIcon,
	PhoneOutlined as PhoneIcon,
	EmailOutlined as EmailIcon,
	EventOutlined as EventIcon,
	AddOutlined as AddIcon
} from "@material-ui/icons";

import Grid from '@mui/material/Grid';
import Autocomplete from '@mui/material/Autocomplete';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { TagsContainer } from "../TagsContainer";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles(theme => ({
	root: {
		display: "flex",
		flexWrap: "wrap",
	},
	drawerPaper: {
		width: 480,
		maxWidth: '100%',
		padding: 0,
		borderRadius: 12,
		height: 'calc(100% - 32px)',
		marginTop: 16,
		marginBottom: 16,
		marginRight: 16,
		overflow: 'hidden',
		backgroundColor: theme.palette.type === 'dark' ? '#1c1c1e' : '#ffffff',
		boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
		display: 'flex',
		flexDirection: 'column',
	},
	backdrop: {
		backgroundColor: 'rgba(0,0,0,0.5)',
		backdropFilter: 'blur(3px)',
	},
	topBar: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: '12px 20px',
		borderBottom: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f0f0f0',
	},
	mainContent: {
		flex: 1,
		overflowY: 'auto',
		padding: '24px 24px 16px',
		display: 'flex',
		flexDirection: 'column',
		gap: 0,
		'&::-webkit-scrollbar': {
			width: '5px',
		},
		'&::-webkit-scrollbar-thumb': {
			backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.08)',
			borderRadius: '3px',
		},
	},
	titleInput: {
		'& .MuiInputBase-root': {
			fontSize: 20,
			fontWeight: 500,
			padding: 0,
			letterSpacing: '-0.01em',
		},
		'& .MuiInput-underline:before': { border: 'none' },
		'& .MuiInput-underline:after': { border: 'none' },
		'& .MuiInput-underline:hover:before': { border: 'none' },
		'& .MuiInputBase-input::placeholder': {
			color: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
			opacity: 1,
		},
		marginBottom: 16,
	},
	quickActions: {
		display: 'flex',
		flexWrap: 'wrap',
		alignItems: 'center',
		gap: 6,
		marginBottom: 24,
	},
	fieldsSection: {
		borderTop: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f0f0f0',
		paddingTop: 16,
		marginTop: 8,
	},
	fieldsSectionTitle: {
		fontSize: 12,
		fontWeight: 600,
		color: theme.palette.text.secondary,
		letterSpacing: '0.02em',
		marginBottom: 12,
	},
	fieldRow: {
		marginBottom: 8,
	},
	fieldInput: {
		'& .MuiOutlinedInput-root': {
			borderRadius: 8,
			fontSize: 13,
			minHeight: 40,
			backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.03)' : '#fafafa',
		},
		'& .MuiOutlinedInput-input': {
			padding: '10px 12px',
			fontSize: 13,
			lineHeight: 1.4,
		},
		'& .MuiOutlinedInput-input[type="date"]': {
			paddingTop: 10,
			paddingBottom: 10,
		},
		'& .MuiAutocomplete-inputRoot[class*="MuiOutlinedInput-root"]': {
			padding: '2px 8px !important',
			minHeight: 40,
		},
		'& .MuiInputLabel-outlined': {
			fontSize: 13,
			transform: 'translate(12px, 11px) scale(1)',
		},
		'& .MuiInputLabel-outlined.MuiInputLabel-shrink': {
			transform: 'translate(12px, -6px) scale(0.75)',
		},
		'& .MuiOutlinedInput-notchedOutline': {
			borderColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb',
		},
		'& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
			borderColor: theme.palette.primary.main,
		},
	},
	fieldLabel: {
		display: 'block',
		fontSize: 11,
		fontWeight: 600,
		color: theme.palette.text.secondary,
		marginBottom: 6,
		letterSpacing: '0.02em',
	},
	footer: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: '12px 20px',
		borderTop: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f0f0f0',
		backgroundColor: theme.palette.type === 'dark' ? '#1c1c1e' : '#ffffff',
	},
	submitBtn: {
		height: 34,
		borderRadius: 8,
		fontSize: 13,
		fontWeight: 600,
		textTransform: 'none',
		padding: '0 18px',
		backgroundColor: theme.palette.type === 'dark' ? '#1e3a5f' : '#1e40af',
		color: '#fff',
		boxShadow: 'none',
		'&:hover': {
			backgroundColor: '#6d28d9',
			boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
		},
		'&:disabled': {
			backgroundColor: '#a78bfa',
			color: 'rgba(255,255,255,0.7)',
		}
	},
	moreBtn: {
		width: 28,
		height: 28,
		borderRadius: 6,
		border: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
		color: theme.palette.text.secondary,
		fontSize: 16,
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		cursor: 'pointer',
		'&:hover': {
			backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : '#f9fafb',
		}
	},
	extraAttr: {
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
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
}));

const formatDateForInput = (date) => {
	if (!date) return '';
	if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return date;
	}
	const d = new Date(date);
	if (isNaN(d.getTime())) return '';
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const parseDateFromInput = (dateString) => {
	if (!dateString) return null;
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
		return dateString;
	}
	if (dateString.includes('T')) {
		return dateString.split('T')[0];
	}
	return dateString;
};

const ContactSchema = Yup.object().shape({
	name: Yup.string()
		.min(2, "Too Short!")
		.max(250, "Too Long!")
		.required("Required"),
	number: Yup.string().min(8, "Too Short!").max(50, "Too Long!"),
	email: Yup.string().email("Invalid email"),
});

const ContactModal = ({ open, onClose, contactId, initialValues, onSave }) => {
	const classes = useStyles();
	const theme = useTheme();
	const isDark = theme.palette.type === 'dark';
	const isMounted = useRef(true);
	const { user } = useContext(AuthContext);

	const initialState = {
		name: "",
		number: "",
		email: "",
		disableBot: false,
		lgpdAcceptedAt: "",
		birthDate: ""
	};

	const [contact, setContact] = useState(initialState);
	const [disableBot, setDisableBot] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
	const [selectedQueue, setSelectedQueue] = useState(null);
	const [queues, setQueues] = useState([]);
	const [allQueues, setAllQueues] = useState([]);
	const [options, setOptions] = useState([]);
	const [loading, setLoading] = useState(false);
	const [searchParam, setSearchParam] = useState("");
	const [showFields, setShowFields] = useState(false);

	useEffect(() => {
		if (!open) return;
		(async () => {
			try {
				const { data } = await api.get("/queue", {
					params: user?.companyId ? { companyId: user.companyId } : undefined
				});
				setAllQueues(data || []);
				setQueues(data || []);
			} catch (e) {
				setAllQueues([]);
				setQueues([]);
			}
		})();
	}, [open, user?.companyId]);

	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	useEffect(() => {
		if (!open || searchParam.length < 3) {
			setLoading(false);
			setSelectedQueue("");
			return;
		}
		const delayDebounceFn = setTimeout(() => {
			setLoading(true);
			const fetchUsers = async () => {
				try {
					const { data } = await api.get("/users/", {
						params: { searchParam },
					});
					setOptions(data.users);
					setLoading(false);
				} catch (err) {
					setLoading(false);
					toastError(err);
				}
			};
			fetchUsers();
		}, 500);
		return () => clearTimeout(delayDebounceFn);
	}, [searchParam, open]);

	useEffect(() => {
		const fetchContact = async () => {
			if (initialValues) {
				setContact(prevState => ({
					...prevState,
					...initialValues,
					birthDate: formatDateForInput(initialValues.birthDate)
				}));
			}
			if (!contactId) return;
			try {
				const { data } = await api.get(`/contacts/${contactId}`);
				if (isMounted.current) {
					setContact({
						...data,
						birthDate: formatDateForInput(data.birthDate)
					});
					setDisableBot(data.disableBot);
					if (data.contactWallets && data.contactWallets.length > 0) {
						const wallet = data.contactWallets[0].wallet;
						const queue = data.contactWallets[0].queue;
						setSelectedUser({ id: wallet.id, name: wallet.name });
						setSelectedQueue(queue.id);
						setQueues([{ id: queue.id, name: queue.name }]);
					} else {
						setSelectedUser(null);
						setSelectedQueue(null);
						setQueues([]);
					}
				}
			} catch (err) {
				toastError(err);
			}
		};
		fetchContact();
	}, [contactId, open, initialValues]);

	const handleClose = () => {
		onClose();
		setContact(initialState);
		setSelectedUser(null);
		setSelectedQueue(null);
		setQueues([]);
		setShowFields(false);
	};

	const handleSaveContact = async values => {
		try {
			const contactData = {
				...values,
				disableBot: disableBot,
				birthDate: parseDateFromInput(values.birthDate)
			};

			if (contactId) {
				if (!selectedUser && !selectedQueue) {
					delete contact.contactWallets;
					await api.delete(`/contacts/wallet/${contactId}`);
				}
				const { contactWallets, ...valuesWithoutWallets } = contactData;
				delete contact.contactWallets;
				const { data: updatedContact } = await api.put(`/contacts/${contactId}`, contactData);
				if (selectedUser && selectedQueue && selectedUser !== null && selectedQueue !== null) {
					await api.put(`/contacts/wallet/${contactId}`, {
						wallets: { userId: selectedUser.id, queueId: selectedQueue },
					});
				}
				if (onSave && updatedContact) onSave(updatedContact);
				handleClose();
			} else {
				delete contactData.contactWallets;
				const { data } = await api.post("/contacts", contactData);
				if (data.id && selectedUser && selectedQueue) {
					await api.put(`/contacts/wallet/${data.id}`, {
						wallets: { userId: selectedUser.id, queueId: selectedQueue },
					});
				}
				if (onSave) onSave(data);
				handleClose();
			}
			toast.success(i18n.t("contactModal.success"));
		} catch (err) {
			toastError(err);
		}
	};

	return (
		<div className={classes.root}>
			<Drawer
				anchor="right"
				open={open}
				onClose={handleClose}
				PaperProps={{ className: classes.drawerPaper }}
				BackdropProps={{ className: classes.backdrop }}
				ModalProps={{ keepMounted: true }}
			>
				{/* Top Bar */}
				<Box className={classes.topBar}>
					<Typography style={{ fontSize: 15, fontWeight: 600 }}>
						{contactId
							? `${i18n.t("contactModal.title.edit")}`
							: `${i18n.t("contactModal.title.add")}`}
					</Typography>
					<IconButton onClick={handleClose} size="small" style={{ width: 28, height: 28 }}>
						<CloseIcon style={{ fontSize: 18 }} />
					</IconButton>
				</Box>

				<Formik
					initialValues={contact}
					enableReinitialize={true}
					validationSchema={ContactSchema}
					onSubmit={(values, actions) => {
						setTimeout(() => {
							handleSaveContact(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ values, errors, touched, isSubmitting, setFieldValue }) => (
						<Form style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
							<Box className={classes.mainContent}>
								{/* Title - Name */}
								<Field
									as={TextField}
									className={classes.titleInput}
									placeholder={i18n.t("contactModal.form.name")}
									name="name"
									autoFocus
									fullWidth
									InputProps={{ disableUnderline: true }}
									error={touched.name && Boolean(errors.name)}
									helperText={touched.name && errors.name}
								/>

								{/* Quick Actions */}
								<Box className={classes.quickActions}>
									<Field
										as={TextField}
										name="number"
										placeholder={i18n.t("contactModal.form.number")}
										error={touched.number && Boolean(errors.number)}
										InputProps={{
											disableUnderline: true,
											startAdornment: <PhoneIcon style={{ fontSize: 15, marginRight: 4, opacity: 0.5 }} />,
											style: { fontSize: 12, height: 30, padding: '0 8px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', borderRadius: 6 }
										}}
										style={{ width: 165 }}
									/>
									<Field
										as={TextField}
										name="email"
										placeholder="Email"
										error={touched.email && Boolean(errors.email)}
										InputProps={{
											disableUnderline: true,
											startAdornment: <EmailIcon style={{ fontSize: 15, marginRight: 4, opacity: 0.5 }} />,
											style: { fontSize: 12, height: 30, padding: '0 8px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', borderRadius: 6 }
										}}
										style={{ minWidth: 160, flex: 1 }}
									/>
									<Box className={classes.moreBtn} onClick={() => setShowFields(!showFields)}>
										···
									</Box>
								</Box>

								{/* Tags */}
								<div style={{ marginBottom: 16 }}>
									<TagsContainer contact={contact} />
								</div>

								{/* Fields Section */}
								<Box className={classes.fieldsSection}>
									<Typography className={classes.fieldsSectionTitle}>
										Campos
									</Typography>

									<Box className={classes.fieldRow}>
										<Typography component="label" className={classes.fieldLabel}>
											Data de nascimento
										</Typography>
										<Field
											as={TextField}
											className={classes.fieldInput}
											name="birthDate"
											type="date"
											placeholder=""
											fullWidth
											variant="outlined"
											size="small"
											InputLabelProps={{ shrink: false }}
											onChange={(e) => {
												const formattedDate = parseDateFromInput(e.target.value);
												setFieldValue('birthDate', formattedDate);
											}}
										/>
									</Box>

									<Box className={classes.fieldRow}>
										<Typography component="label" className={classes.fieldLabel}>
											LID (Linked Device ID)
										</Typography>
										<TextField
											className={classes.fieldInput}
											value={contact.lid || "—"}
											disabled
											fullWidth
											variant="outlined"
											size="small"
											placeholder="Não disponível"
											InputLabelProps={{ shrink: false }}
										/>
									</Box>

									{showFields && (
										<>
											{/* Wallet / Queue section */}
											<Typography style={{ fontSize: 12, fontWeight: 600, color: theme.palette.text.secondary, letterSpacing: '0.02em', marginBottom: 8, marginTop: 12 }}>
												{i18n.t("contactModal.form.assignWallet")}
											</Typography>
											<Box style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
												<Autocomplete
													value={selectedUser}
													fullWidth
													size="small"
													getOptionLabel={(option) => `${option.name}`}
													onChange={(e, newValue) => {
														setSelectedUser(newValue);
														if (newValue != null && Array.isArray(newValue.queues)) {
															if (newValue.queues.length === 1) {
																setSelectedQueue(newValue.queues[0].id);
															}
															setQueues(newValue.queues);
														} else {
															setQueues(allQueues);
															setSelectedQueue(null);
															setSelectedUser(null);
														}
													}}
													options={options}
													filterOptions={(options, { inputValue }) =>
														options.filter((option) =>
															option.name.toLowerCase().includes(inputValue.toLowerCase())
														)
													}
													freeSolo
													autoHighlight
													noOptionsText={i18n.t("transferTicketModal.noOptions")}
													loading={loading}
													renderOption={(props, option) => (
														<li {...props}>
															<span style={{ marginLeft: 8 }}>{option.name}</span>
														</li>
													)}
													renderInput={(params) => (
														<TextField
															{...params}
															label="Usuário"
															placeholder="Buscar usuário"
															variant="outlined"
															onChange={(e) => setSearchParam(e.target.value)}
															InputLabelProps={{ shrink: Boolean(selectedUser) }}
															InputProps={{
																...params.InputProps,
																endAdornment: (
																	<React.Fragment>
																		{loading ? <CircularProgress color="inherit" size={16} /> : null}
																		{params.InputProps.endAdornment}
																	</React.Fragment>
																),
															}}
															className={classes.fieldInput}
														/>
													)}
													style={{ flex: 1 }}
												/>
												<FormControl variant="outlined" size="small" style={{ flex: 1 }}>
													<InputLabel style={{ fontSize: 12 }}>
														{i18n.t("transferTicketModal.fieldQueueLabel")}
													</InputLabel>
													<Select
														value={selectedQueue}
														onChange={(e) => setSelectedQueue(e.target.value)}
														label={i18n.t("transferTicketModal.fieldQueuePlaceholder")}
														style={{ fontSize: 12, borderRadius: 6 }}
													>
														{queues.map((queue) => (
															<MenuItem key={queue.id} value={queue.id}>
																{queue.name}
															</MenuItem>
														))}
													</Select>
												</FormControl>
											</Box>

											<Box style={{ display: 'flex', alignItems: 'center', marginBottom: 8, marginTop: 4 }}>
												<Switch
													size="small"
													checked={disableBot}
													onChange={() => setDisableBot(!disableBot)}
													name="disableBot"
												/>
												<Typography style={{ fontSize: 12, color: theme.palette.text.secondary }}>
													{i18n.t("contactModal.form.chatBotContact")}
												</Typography>
											</Box>

											{/* Extra Info */}
											<Typography style={{ fontSize: 12, fontWeight: 600, color: theme.palette.text.secondary, letterSpacing: '0.02em', marginBottom: 8, marginTop: 12 }}>
												{i18n.t("contactModal.form.extraInfo")}
											</Typography>

											<FieldArray name="extraInfo">
												{({ push, remove }) => (
													<>
														{values.extraInfo &&
															values.extraInfo.length > 0 &&
															values.extraInfo.map((info, index) => (
																<Box
																	key={`${index}-info`}
																	style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}
																>
																	<Field
																		as={TextField}
																		placeholder={i18n.t("contactModal.form.extraName")}
																		name={`extraInfo[${index}].name`}
																		variant="outlined"
																		size="small"
																		className={classes.fieldInput}
																		InputLabelProps={{ shrink: false }}
																		style={{ flex: 1 }}
																	/>
																	<Field
																		as={TextField}
																		placeholder={i18n.t("contactModal.form.extraValue")}
																		name={`extraInfo[${index}].value`}
																		variant="outlined"
																		size="small"
																		className={classes.fieldInput}
																		InputLabelProps={{ shrink: false }}
																		style={{ flex: 1 }}
																	/>
																	<IconButton
																		size="small"
																		onClick={() => remove(index)}
																		style={{ width: 24, height: 24 }}
																	>
																		<DeleteOutlineIcon style={{ fontSize: 16 }} />
																	</IconButton>
																</Box>
															))}
														<Button
															size="small"
															startIcon={<AddIcon style={{ fontSize: 16 }} />}
															onClick={() => push({ name: "", value: "" })}
															style={{
																textTransform: 'none',
																fontSize: 12,
																color: theme.palette.text.secondary,
																fontWeight: 500,
																padding: '4px 8px',
																borderRadius: 6,
																marginTop: 4,
															}}
														>
															{i18n.t("contactModal.buttons.addExtraInfo")}
														</Button>
													</>
												)}
											</FieldArray>
										</>
									)}

									{!showFields && (
										<Button
											size="small"
											startIcon={<AddIcon style={{ fontSize: 16 }} />}
											onClick={() => setShowFields(true)}
											style={{
												textTransform: 'none',
												fontSize: 12,
												color: theme.palette.text.secondary,
												fontWeight: 500,
												padding: '4px 8px',
												borderRadius: 6,
												marginTop: 4,
											}}
										>
											Mais campos
										</Button>
									)}

									{showFields && (
										<Button
											size="small"
											onClick={() => setShowFields(false)}
											style={{
												textTransform: 'none',
												fontSize: 12,
												color: theme.palette.text.secondary,
												fontWeight: 500,
												padding: '4px 8px',
												borderRadius: 6,
												marginTop: 4,
											}}
										>
											Menos campos
										</Button>
									)}
								</Box>
							</Box>

							{/* Footer */}
							<Box className={classes.footer}>
								<Button
									onClick={handleClose}
									disabled={isSubmitting}
									style={{ textTransform: 'none', fontSize: 13 }}
								>
									{i18n.t("contactModal.buttons.cancel")}
								</Button>
								<Button
									type="submit"
									className={classes.submitBtn}
									disabled={isSubmitting}
									variant="contained"
								>
									{contactId
										? `${i18n.t("contactModal.buttons.okEdit")}`
										: `${i18n.t("contactModal.buttons.okAdd")}`}
									{isSubmitting && (
										<CircularProgress
											size={18}
											style={{ color: '#fff', marginLeft: 8 }}
										/>
									)}
								</Button>
							</Box>
						</Form>
					)}
				</Formik>
			</Drawer>
		</div>
	);
};

export default ContactModal;
